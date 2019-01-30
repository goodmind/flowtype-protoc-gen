import {printFileDescriptorTSD} from "./ts/fileDescriptorTSD";
import {printFileDescriptorFlow} from "./flow/fileDescriptorFlow";
import { printFileDescriptorFlowJson } from "./flow-json/fileDescriptorFlowJson";
import {ExportMap} from "./ExportMap";
import {replaceProtoSuffix, withAllStdIn} from "./util";
import {CodeGeneratorRequest, CodeGeneratorResponse} from "google-protobuf/google/protobuf/compiler/plugin_pb";
import {FileDescriptorProto} from "google-protobuf/google/protobuf/descriptor_pb";
import {generateGrpcWebService} from "./service/grpcweb";

/**
 * This is the ProtoC compiler plugin.
 *
 * The Protocol Buffers Compiler can be extended to [support new languages via plugins](https://developers.google.com/protocol-buffers/docs/reference/other).
 * A plugin is just a program which reads a CodeGeneratorRequest protocol buffer from standard input
 * and then writes a CodeGeneratorResponse protocol buffer to standard output.
 * These message types are defined in [plugin.proto](https://github.com/google/protobuf/blob/master/src/google/protobuf/compiler/plugin.proto).
 *
 */
withAllStdIn((inputBuff: Buffer) => {
  try {
    const typedInputBuff = new Uint8Array(inputBuff.length);
    typedInputBuff.set(inputBuff);

    const codeGenRequest = CodeGeneratorRequest.deserializeBinary(typedInputBuff);
    const codeGenResponse = new CodeGeneratorResponse();
    const exportMap = new ExportMap();
    const fileNameToDescriptor: {[key: string]: FileDescriptorProto} = {};

    const params = codeGenRequest.getParameter().split(",");
    // Generate separate `.ts` files for services if param is set
    const generateServices = params.indexOf("service=true") !== -1;

    const generateTs = params.indexOf("ts=true") !== -1;

    codeGenRequest.getProtoFileList().forEach(protoFileDescriptor => {
      fileNameToDescriptor[protoFileDescriptor.getName()] = protoFileDescriptor;
      exportMap.addFileDescriptor(protoFileDescriptor);
    });

    codeGenRequest.getFileToGenerateList().forEach(fileName => {
      const outputFileName = replaceProtoSuffix(fileName);


      if (generateTs) {
        // Generate TS Files
        const thisFile = new CodeGeneratorResponse.File();
        thisFile.setName(outputFileName + ".d.ts");
        thisFile.setContent(printFileDescriptorTSD(fileNameToDescriptor[fileName], exportMap));
        codeGenResponse.addFile(thisFile);
      } else {
        // Generate Flowtype Files
        const thisFileFlow = new CodeGeneratorResponse.File();
        thisFileFlow.setName(outputFileName + ".flow.js");
        thisFileFlow.setContent(printFileDescriptorFlow(fileNameToDescriptor[fileName], exportMap));
        codeGenResponse.addFile(thisFileFlow);
      }

      // Generate Json Flowtype Files
      const thisFileFlow = new CodeGeneratorResponse.File();
      thisFileFlow.setName(outputFileName + ".json.flow.js");
      thisFileFlow.setContent(printFileDescriptorFlowJson(fileNameToDescriptor[fileName], exportMap));
      codeGenResponse.addFile(thisFileFlow);

      if (generateServices) {
        generateGrpcWebService(outputFileName, fileNameToDescriptor[fileName], exportMap)
          .forEach(file => codeGenResponse.addFile(file));
      }
    });

    process.stdout.write(new Buffer(codeGenResponse.serializeBinary()));
  } catch (err) {
    console.error("protoc-gen-flow error: " + err.stack + "\n");
    process.exit(1);
  }
});
