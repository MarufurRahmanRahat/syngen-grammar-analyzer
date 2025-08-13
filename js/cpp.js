const $ = id => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  $("btnLex").addEventListener("click", handleLex);
  $("btnParse").addEventListener("click", handleParse);
});

/* --------- Lexical Analysis --------- */
function performLexicalAnalysis(code){
  const tokens = [];
  const keywords = ["int","float","if","else","while","return","for","void","char","double","struct","main"];
  const operators = ["+","-","*","/","=","==","!=","<",">","<=",">=","++","--","&&","||","!"];
  const delimiters = [";"," ,","(",")","{","}"];
  const tokenRegex = /\s*(\/\/.*|\/\*[\s\S]*?\*\/|==|!=|<=|>=|\+\+|--|&&|\|\||[a-zA-Z_][a-zA-Z0-9_]*|\d+|[+\-*/=<>;(),{}!])\s*/g;

  let m;
  while((m = tokenRegex.exec(code)) !== null){
    const value = m[1];
    let type;
    if(value.startsWith("//") || value.startsWith("/*")) type="Comment";
    else if(keywords.includes(value)) type="Keyword";
    else if(operators.includes(value)) type="Operator";
    else if([";",",","(",")","{","}"].includes(value)) type="Delimiter";
    else if(/^\d+$/.test(value)) type="Number";
    else if(/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) type="Identifier";
    else type="Unknown";
    tokens.push({type,value});
  }
  return tokens;
}

function handleLex(){
  const code = $("codeInput").value;
  const tokens = performLexicalAnalysis(code);
  let html = `<h3>Lexical Tokens</h3><table><thead><tr><th>Token</th><th>Type</th></tr></thead><tbody>`;
  for(const t of tokens) html += `<tr><td>${t.value}</td><td>${t.type}</td></tr>`;
  html += `</tbody></table>`;
  $("outputArea").innerHTML = html;
}

/* --------- Parse Tree (LL(1) subset) --------- */
/*
Grammar:
S -> id = E ;
E -> T E'
E' -> + T E' | ε
T -> F T'
T' -> * F T' | ε
F -> id | ( E )
*/
const PT = {
  "S": { "id":["id","=","E",";"], "(":["id","=","E",";"] }, // allow '(' start by mapping in E below
  "E": { "id":["T","E'"], "(":["T","E'"] },
  "E'": { "+":["+","T","E'"], ";":["ε"], ")":["ε"] },
  "T": { "id":["F","T'"], "(":["F","T'"] },
  "T'": { "+":["ε"], "*":["*","F","T'"], ";":["ε"], ")":["ε"] },
  "F": { "id":["id"], "(":["(","E",")"] }
};

function normalizeTokensForParse(tokens){
  // Keep only tokens relevant to the expression line, map identifiers -> "id"
  // and pass through operators/delimiters
  const allowed = new Set(["id","+","*","=","(",")",";"]);
  const out=[];
  for(const t of tokens){
    if(t.type==="Identifier") out.push("id");
    else if(allowed.has(t.value)) out.push(t.value);
    else if(t.value==="int"||t.value==="float"||t.value==="double"||t.value==="char"||t.value==="void"){
      // skip type keywords so you can paste entire functions; parsing targets statements inside
      continue;
    } else if(t.type==="Comment") continue;
    else if(t.type==="Number"){ out.push("id"); } // treat numbers as id for this tiny grammar
  }
  return out;
}

function generateParseTreeFromInput(rawCode){
  const tokens = performLexicalAnalysis(rawCode);
  const input = normalizeTokensForParse(tokens);
  // Find the first pattern that looks like: id = ... ;
  const start = input.indexOf("id");
  if(start<0) throw new Error("No statement starting with identifier found.");
  const semi = input.indexOf(";", start);
  if(semi<0) throw new Error("Missing semicolon ';' for the statement.");
  const stmt = input.slice(start, semi+1);
  // LL(1) parse using PT:
  const stack = ["$","S"];
  const tree = { name:"S", children:[] };
  const nodeStack = [tree];
  let i=0;

  const lookahead = ()=> (i<stmt.length ? stmt[i] : "$");

  while(stack.length){
    const top = stack.pop();
    const node = nodeStack.pop();
    const a = lookahead();

    if(top==="ε"){ node.children.push({name:"ε"}); continue; }
    if(top==="$" && a==="$"){ node.children.push({name:"$ (Accepted)"}); break; }
    if(!PT[top]){ // terminal
      if(top===a){
        node.children.push({name:a});
        i++;
      }else{
        node.children.push({name:`✖ Error: expected "${top}" but saw "${a}"`});
        break;
      }
    }else{
      const rule = PT[top][a];
      if(!rule){
        node.children.push({name:`✖ Error at "${a}"`});
        break;
      }
      node.children = rule.map(sym=> ({name:sym, children:[]}));
      for(let k=rule.length-1;k>=0;k--){
        stack.push(rule[k]);
        nodeStack.push(node.children[k]);
      }
    }
  }
  return tree;
}

function renderTree(node){
  if(!node.children || node.children.length===0) return `<li><span class="node">${node.name}</span></li>`;
  return `<li><span class="node">${node.name}</span><ul>${node.children.map(renderTree).join("")}</ul></li>`;
}

function handleParse(){
  $("outputArea").innerHTML = "";
  $("treeArea").innerHTML = "";
  try{
    const code = $("codeInput").value;
    const tree = generateParseTreeFromInput(code);
    $("treeArea").innerHTML = `<h3>Parse Tree</h3><div class="tree"><ul>${renderTree(tree)}</ul></div>`;
  }catch(e){
    $("treeArea").innerHTML = `<div class="output">Error: ${e.message}</div>`;
  }
}
