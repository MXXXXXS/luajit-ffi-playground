print("Hello world")

local ffi = require("ffi")

ffi.cdef [[
    int add(int a, int b);
]]

local lib = ffi.load("build/addlib.cpp/Debug/addlib.cpp.o.dll")
print(lib.add(6, 3))
