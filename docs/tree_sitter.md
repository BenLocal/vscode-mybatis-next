# TreeSitter

## perbuild

### Install tree-sitter-cli and build the tree-sitter-xml grammars
- with npm
``` shell
npm install tree-sitter-cli
```

- with cargo
``` shell
cargo install --locked tree-sitter-cli
```

- Then build the tree-sitter-xml grammar
``` shell
npx tree-sitter build --wasm node_modules/@tree-sitter-grammars/tree-sitter-xml/xml
```