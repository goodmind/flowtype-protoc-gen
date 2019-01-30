[![Master Build](https://travis-ci.org/chrisgervang/flowtype-protoc-gen.svg?branch=master)](https://travis-ci.org/chrisgervang/flowtype-protoc-gen)
[![NPM](https://img.shields.io/npm/v/flowtype-protoc-gen.svg)](https://www.npmjs.com/package/flowtype-protoc-gen)
[![NPM](https://img.shields.io/npm/dm/flowtype-protoc-gen.svg)](https://www.npmjs.com/package/flowtype-protoc-gen)
[![Apache 2.0 License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

# flowtype-protoc-gen
> Protoc Plugin for generating Flowtype Declarations

This repository contains a [protoc](https://github.com/google/protobuf) plugin that generates Flowtype declarations
(`.flow.js` files) that match the JavaScript output of `protoc --js_out=import_style=commonjs,binary`. This plugin can
also output service definitions as both `.js` and `.flow.js` files in the structure required by [grpc-web](https://github.com/improbable-eng/grpc-web).

This plugin is tested and written using TypeScript 2.7.

## Installation

### npm
As a prerequisite, download or install `protoc` (the protocol buffer compiler) for your platform from the [github releases page](https://github.com/google/protobuf/releases) or via a package manager (ie: [brew](http://brewformulas.org/Protobuf), [apt](https://www.ubuntuupdates.org/pm/protobuf-compiler)).

For the latest stable version of the flowtype-protoc-gen plugin:

```bash
npm install flowtype-protoc-gen
```

For our latest build straight from master:

```bash
npm install flowtype-protoc-gen@next
```

## Contributing
Contributions are welcome! Please refer to [CONTRIBUTING.md](https://github.com/chrisgervang/flowtype-protoc-gen/blob/master/CONTRIBUTING.md) for more information.

## Usage
As mentioned above, this plugin for `protoc` serves two purposes:
1. Generating Flowtype Definitions for CommonJS modules generated by protoc
2. Generating gRPC Service Stubs for use with [grpc-web](https://github.com/improbable-eng/grpc-web).

### Generating Flowtype Definitions for CommonJS modules generated by protoc
By default, protoc will generate ES5 code when the `--js_out` flag is used (see [javascript compiler documentation](https://github.com/google/protobuf/tree/master/js)). You have the choice of two module syntaxes, [CommonJS](https://nodejs.org/docs/latest-v8.x/api/modules.html) or [closure](https://developers.google.com/closure/library/docs/tutorial). This plugin (`flowtype-protoc-gen`) can be used to generate Flowtype definition files (`.flow.js`) to provide type hints for CommonJS modules only.

To generate Flowtype definitions you must first configure `protoc` to use this plugin and then specify where you want the Flowtype definitions to be written to using the `--flow_out` flag.

```bash
# Path to this plugin
PROTOC_GEN_FLOW_PATH="./node_modules/.bin/protoc-gen-flow"

# Directory to write generated code to (.js and .flow.js files)
OUT_DIR="./generated"

protoc \
    --plugin="protoc-gen-flow=${PROTOC_GEN_FLOW_PATH}" \
    --js_out="import_style=commonjs,binary:${OUT_DIR}" \
    --flow_out="${OUT_DIR}" \
    users.proto base.proto
```

In the above example, the `generated` folder will contain both `.js` and `.flow.js` files which you can reference in your Flowtype project to get full type completion and make use of ES6-style import statements, eg:

```js
import { MyMessage } from "../generated/users_pb";

const msg = new MyMessage();
msg.setName("John Doe");
```

### Generating gRPC Service Stubs for use with grpc-web
[gRPC](https://grpc.io/) is a framework that enables client and server applications to communicate transparently, and makes it easier to build connected systems.

[grpc-web](https://github.com/improbable-eng/grpc-web) is a comparability layer on both the server and client-side which allows gRPC to function natively in modern web-browsers.

To generate client-side service stubs from your protobuf files you must configure flowtype-protoc-gen to emit service definitions by passing the `service=true` param to the `--flow_out` flag, eg:

```
# Path to this plugin, Note this must be an abolsute path on Windows (see #15)
PROTOC_GEN_FLOW_PATH="./node_modules/.bin/protoc-gen-flow"

# Directory to write generated code to (.js and .flow.js files)
OUT_DIR="./generated"

protoc \
    --plugin="protoc-gen-flow=${PROTOC_GEN_FLOW_PATH}" \
    --js_out="import_style=commonjs,binary:${OUT_DIR}" \
    --flow_out="service=true:${OUT_DIR}" \
    users.proto base.proto
```

The `generated` folder will now contain both `pb_service.js` and `pb_service.flow.js` files which you can reference in your Flowtype project to make RPCs.

**Note** Note that these modules require a CommonJS environment. If you intend to consume these stubs in a browser environment you will need to use a module bundler such as [webpack](https://webpack.js.org/).
**Note** Both `js` and `flow.js` service files will be generated regardless of whether there are service definitions in the proto files.

```js
import { UserServiceClient, GetUserRequest } from "../generated/users_pb_service"

const client = new UserServiceClient("https://my.grpc/server");
const req = new GetUserRequest();
req.setUsername("johndoe");
client.getUser(req, (err, user) => { /* ... */ });
```

## Examples
For a sample of the generated protos and service definitions, see [examples](https://github.com/chrisgervang/flowtype-protoc-gen/tree/master/examples).

To generate the examples from protos, please run `./generate.sh`

## Gotchas
By default the google-protobuf library will use the JavaScript number type to store 64bit float and integer values; this can lead to overflow problems as you exceed JavaScript's `Number.MAX_VALUE`. To work around this, you should consider using the `jstype` annotation on any 64bit fields, ie:

```proto
message Example {
  uint64 bigInt = 1 [jstype = JS_STRING];
}
```

### bazel
<details><summary>Instructions for using flowtype-protoc-gen within a <a href="https://bazel.build/>bazel">bazel</a> build environment</summary><p>

Include the following in your `WORKSPACE`:

```python
git_repository(
    name = "io_bazel_rules_go",
    commit = "6bee898391a42971289a7989c0f459ab5a4a84dd",  # master as of May 10th, 2018
    remote = "https://github.com/bazelbuild/rules_go.git",
    )
load("@io_bazel_rules_go//go:def.bzl", "go_rules_dependencies", "go_register_toolchains")
go_rules_dependencies()
go_register_toolchains()

http_archive(
  name = "io_bazel_rules_webtesting",
  strip_prefix = "rules_webtesting-master",
  urls = [
    "https://github.com/bazelbuild/rules_webtesting/archive/master.tar.gz",
  ],
)
load("@io_bazel_rules_webtesting//web:repositories.bzl", "browser_repositories", "web_test_repositories")
web_test_repositories()

git_repository(
  name = "build_bazel_rules_nodejs",
  remote = "https://github.com/bazelbuild/rules_nodejs.git",
  commit = "d334fd8e2274fb939cf447106dced97472534e80",
)
load("@build_bazel_rules_nodejs//:defs.bzl", "node_repositories")
node_repositories(package_json = ["//:package.json"])

git_repository(
    name = "flowtype_protoc_gen",
    remote = "https://github.com/chrisgervang/flowtype-protoc-gen.git",
    commit = "05c52b843edf9420be3a9549d01352dfeff76a5e",
)

load("@ts_protoc_gen//:defs.bzl", "typescript_proto_dependencies")
typescript_proto_dependencies()

git_repository(
  name = "build_bazel_rules_typescript",
  remote = "https://github.com/bazelbuild/rules_typescript.git",
  commit = "3488d4fb89c6a02d79875d217d1029182fbcd797",
)
load("@build_bazel_rules_typescript//:defs.bzl", "ts_setup_workspace")
flow_setup_workspace()
```

Now in your `BUILD.bazel`:

```python
load("@ts_protoc_gen//:defs.bzl", "typescript_proto_library")

filegroup(
  name = "proto_files",
  srcs = glob(["*.proto"]),
)

proto_library(
  name = "proto",
  srcs = [
    ":proto_files",
  ],
)

typescript_proto_library(
  name = "generate",
  proto = ":proto",
)
```

</p></details>
