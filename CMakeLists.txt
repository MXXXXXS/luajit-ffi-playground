cmake_minimum_required(VERSION 3.26)

# vcpkg
set(VCPKG_ROOT $ENV{VCPKG_ROOT})
set(CMAKE_TOOLCHAIN_FILE "${VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake")

if(WIN32)
  add_compile_options("$<$<C_COMPILER_ID:MSVC>:/utf-8>")
  add_compile_options("$<$<CXX_COMPILER_ID:MSVC>:/utf-8>")
endif()

if(WIN32)
  execute_process(
    COMMAND bash.exe -c "npx ts-node cmake/fillSetSources.ts"
    WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
  )
else()
  execute_process(
    COMMAND npx ts-node cmake/fillSetSources.ts
    WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
  )
endif()

project(luajit_ffi_playground LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 17)

set(CMAKE_BINARY_DIR ${CMAKE_CURRENT_SOURCE_DIR}/build)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

file(GLOB SOURCE_HEADERS src/cpp/common/*)
include_directories(src/cpp/common)
include(cmake/setSources.cmake)

function(add_sources NAME_PATTERN)
  file(GLOB SOURCE_NAMES ${NAME_PATTERN})

  string(REPLACE ";" "\n  " SOURCE_FILES "${SOURCE_NAMES}")
  message("📁 Source: ${NAME_PATTERN}:\n   📄 ${SOURCE_FILES}")

  foreach(file ${SOURCE_NAMES})
    get_filename_component(file_name ${file} NAME)
    set(target_name "${file_name}.o")

    if(target_name MATCHES ".*lib.c.*$")
      add_library(${target_name} SHARED ${file} ${SOURCE_HEADERS})
    elseif()
      add_executable(${target_name} ${file})
    endif()

    set_target_properties(${target_name} PROPERTIES
      RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/${file_name}
      ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/${file_name}
      LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/${file_name}
    )

    if(DEFINED ${target_name}_SOURCES)
      target_sources(${target_name} PRIVATE ${${target_name}_SOURCES})
    endif()
  endforeach()
endfunction()

add_sources(src/cpp/*.cpp)

# message
get_property(includes DIRECTORY PROPERTY INCLUDE_DIRECTORIES)
message("🗃️ Include:")

foreach(include_dir ${includes})
  message("   📁 ${include_dir}")
endforeach()