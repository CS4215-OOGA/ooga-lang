// import * as fs from 'fs';

interface CliOptions {
  compileTo: 'json'
  inputFilename: string
  outputFilename: string
}

function parseOptions(): CliOptions | null {
  const ret: CliOptions = {
    compileTo: 'json',
    inputFilename: '',
    outputFilename: null
  };

  let endOfOptions = false;
  let error = false;
  const args = process.argv.slice(2);
  while (args.length > 0) {
    let option = args[0];
    let argument = args[1];

    let argShiftNumber = 2
    if (!endOfOptions && option.startsWith('--') && option.includes('=')) {
      ;[option, argument] = option.split('=')
      argShiftNumber = 1
    }
    if (!endOfOptions && option.startsWith('-')) {
      switch (option) {
        case '--compile-to':
        case '-t':
          switch (argument) {
            case 'json':
              break
            default:
              console.error('Invalid argument to --compile-to: %s', argument)
              error = true
              break
          }
          args.splice(0, argShiftNumber)
          break
        case '--out':
        case '-o':
          ret.outputFilename = argument
          args.splice(0, argShiftNumber)
          break
        case '--':
          endOfOptions = true
          args.shift()
          break
        default:
          console.error('Unknown option %s', option)
          args.shift()
          error = true
          break
      }
    } else {
      if (ret.inputFilename === '') {
        ret.inputFilename = args[0]
      } else {
        console.error('Excess non-option argument: %s', args[0])
        error = true
      }
      args.shift()
    }
  }

  if (ret.inputFilename === '') {
    console.error('No input file specified');
    error = true;
  }

  return error ? null : ret;
}

async function main() {
  const options = parseOptions();
  if (options == null) {
    console.error(`Usage: svmc [options...] <input file>

Options:
-t, --compile-to <option>: [binary]
  json: Compile only, but don't assemble.
  binary: Compile and assemble.
  debug: Compile and pretty-print the compiler output. For debugging the compiler.
  ast: Parse and pretty-print the AST. For debugging the parser.
-o, --out <filename>: [see below]
  Sets the output filename.
  Defaults to the input filename, minus any '.js' extension, plus '.svm'.
--:
  Signifies the end of arguments, in case your input filename starts with -.`)
    process.exitCode = 1;
    return;
  }
}

main().catch(err => {
  console.error(err);
})
