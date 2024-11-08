import handlebars from "handlebars"
import fs from "node:fs"
import fsp from "node:fs/promises"
import path from "node:path"

const rootDir = path.join(__dirname, "..")
const sourceDirs = [
  "src/cpp",
  // 'src/cpp/tests'
].map((dir) => path.join(rootDir, dir))
const includeDirs = [
  "src/cpp/common",
  // "src/cpp/tests/utils",
].map((dir) => path.join(rootDir, dir))

const headerFileReg = /\.(cuh|hpp)$/
const includeHeaderReg = /#include "([\w.]+\.(cuh|hpp))"/g
const sourceFileReg = /\.(cu|cpp)$/

const headerSourceExtensionMap = {
  hpp: "cpp",
  cuh: "cu",
}

function iterateFiles(dir: string, handleFile: (filePath: string) => void) {
  const files = fs.readdirSync(dir)
  files.forEach((fileName) => {
    const filePath = path.join(dir, fileName)
    const fsStats = fs.statSync(filePath)
    if (fsStats.isFile()) {
      handleFile(filePath)
    }
  })
}

const headerFiles: string[] = []

includeDirs.forEach((includeDir) => {
  iterateFiles(includeDir, (filePath) => {
    if (headerFileReg.test(filePath)) {
      headerFiles.push(filePath)
    }
  })
})

type TargetSource = {
  targetName: string
  sourceFilePaths: string[]
}

const targetSources: TargetSource[] = []

async function collectDeps(
  filePath: string,
  sourceFilePaths: string[],
  handledFilePaths: string[] = []
) {
  if (handledFilePaths.includes(filePath)) return
  handledFilePaths.push(filePath)
  const sourceContent = await fsp.readFile(filePath, {
    encoding: "utf8",
  })
  const it = sourceContent.matchAll(includeHeaderReg)
  for (const matchGroup of it) {
    const [_, matchHeaderFileName] = matchGroup
    headerFilesFor: for (let idx = 0; idx < headerFiles.length; idx++) {
      const headerFile = headerFiles[idx]
      if (path.basename(headerFile) == matchHeaderFileName) {
        // 递归遍历头文件
        await collectDeps(headerFile, sourceFilePaths, handledFilePaths)
        // 递归遍历源文件
        const pathParts = headerFile.split(".")
        const extHeader = pathParts.at(
          -1
        ) as keyof typeof headerSourceExtensionMap
        const ext = headerSourceExtensionMap[extHeader]
        pathParts.splice(-1, 1, ext)
        const sourceFilePath = pathParts.join(".")
        if (
          fs.existsSync(sourceFilePath) &&
          !sourceFilePaths.includes(sourceFilePath)
        ) {
          sourceFilePaths.push(sourceFilePath)
          await collectDeps(sourceFilePath, sourceFilePaths, handledFilePaths)
        }
        break headerFilesFor
      }
    }
  }
}

async function main() {
  await Promise.all(
    sourceDirs
      .map((sourceDir) => {
        const filePaths: string[] = []
        iterateFiles(sourceDir, (filePath) => {
          filePaths.push(filePath)
        })
        return filePaths.map((filePath) =>
          (async () => {
            if (sourceFileReg.test(filePath)) {
              const targetName = path.basename(filePath)
              const targetSource: TargetSource = {
                targetName: targetName + ".o",
                sourceFilePaths: [],
              }
              await collectDeps(filePath, targetSource.sourceFilePaths)
              targetSource.sourceFilePaths = [
                ...new Set(targetSource.sourceFilePaths),
              ].map((p) => p.replaceAll("\\", "/"))
              if (targetSource.sourceFilePaths.length > 0) {
                targetSources.push(targetSource)
              }
            }
          })()
        )
      })
      .flat()
  )

  const setSourceTemplateStr = `{{#each targetNames}}
set({{this.targetName}}_SOURCES
{{#each this.sourceFilePaths}}
  {{this}}
{{/each}})
{{/each}}
`
  const setSourceOutPath = path.join(rootDir, "cmake/setSources.cmake")

  const setSourceTemplate = handlebars.compile(setSourceTemplateStr)
  const setSourceStr = setSourceTemplate({
    targetNames: targetSources,
  })

  fs.writeFileSync(setSourceOutPath, setSourceStr, { encoding: "utf8" })
}

main()
