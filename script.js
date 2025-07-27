let currentSection = 'grammar';
let parsedGrammar = {};

function showSection(section) {
  currentSection = section;
  const titles = {
  grammar: "Grammar Input",
  leftRec: "Left Recursion Elimination",
  leftFactoring: "Left Factoring",
  first: "FIRST Set Calculation",
  follow: "FOLLOW Set Calculation",
  ll1: "LL(1) Parsing Table"
};

  document.getElementById("sectionTitle").innerText = titles[section];
  document.getElementById("outputArea").innerText = "";
}

function parseGrammar(input) {
  parsedGrammar = {};
  const lines = input.split(/\n|\r/).map(line => line.trim()).filter(line => line);
  for (const line of lines) {
    const [lhs, rhs] = line.split("->").map(s => s.trim());
    const productions = rhs.split("|").map(s => s.trim());
    if (!parsedGrammar[lhs]) parsedGrammar[lhs] = [];
    parsedGrammar[lhs].push(...productions);
  }
}

function eliminateLeftRecursion(grammar) {
  const result = {};
  for (const A in grammar) {
    const alpha = [], beta = [];
    grammar[A].forEach(prod => {
      if (prod.startsWith(A)) {
        alpha.push(prod.slice(A.length).trim());
      } else {
        beta.push(prod);
      }
    });

    if (alpha.length > 0) {
      const A1 = A + "'";
      result[A] = beta.map(b => b + " " + A1);
      result[A1] = alpha.map(a => a + " " + A1);
      result[A1].push("ε");
    } else {
      result[A] = grammar[A];
    }
  }
  return result;
}

function computeFirstSets(grammar) {
  const first = {};
  const isTerminal = (symbol) => !grammar[symbol];

  const findFirst = (symbol) => {
    if (first[symbol]) return first[symbol];
    first[symbol] = new Set();
    if (isTerminal(symbol)) {
      first[symbol].add(symbol);
      return first[symbol];
    }

    for (const prod of grammar[symbol]) {
      const symbols = prod.split(" ");
      for (const sym of symbols) {
        const firstSym = findFirst(sym);
        for (const f of firstSym) {
          if (f !== "ε") first[symbol].add(f);
        }
        if (!firstSym.has("ε")) break;
      }
    }
    return first[symbol];
  };

  for (const nonTerminal in grammar) {
    findFirst(nonTerminal);
  }

  return first;
}

function displayGrammar(grammar) {
  let output = "";
  for (const lhs in grammar) {
    output += lhs + " -> " + grammar[lhs].join(" | ") + "\n";
  }
  return output;
}

// display function for left recursion
function displayLeftRecursion(grammar) {
  let output = "Grammar After Eliminating Left Recursion:\n";
  for (const lhs in grammar) {
    output += lhs + " -> " + grammar[lhs].join(" | ") + "\n";
  }
  return output;
}

// display function for left factoring 
function displayLeftFactoring(grammar) {
  let output = "Grammar After Left Factoring:\n";
  for (const lhs in grammar) {
    output += lhs + " -> " + grammar[lhs].join(" | ") + "\n";
  }
  return output;
}


function displayFirstSets(first) {
  let output = "FIRST Sets:\n";
  for (const nt in first) {
    output += `FIRST(${nt}) = { ${Array.from(first[nt]).join(", ")} }\n`;
  }
  return output;
}


// follow grammar 
function computeFollowSets(grammar, firstSets, startSymbol) {
  const follow = {};
  for (const nt in grammar) {
    follow[nt] = new Set();
  }
  follow[startSymbol].add("$");

  let changed = true;
  while (changed) {
    changed = false;
    for (const lhs in grammar) {
      for (const production of grammar[lhs]) {
        const symbols = production.trim().split(/\s+/);
        for (let i = 0; i < symbols.length; i++) {
          const B = symbols[i];
          if (!grammar[B]) continue;

          let followAdded = new Set();
          let allEpsilon = true;

          for (let j = i + 1; j < symbols.length; j++) {
            const sym = symbols[j];
            const firstSym = firstSets[sym] || new Set([sym]);

            for (const f of firstSym) {
              if (f !== "ε") followAdded.add(f);
            }

            if (!firstSym.has("ε")) {
              allEpsilon = false;
              break;
            }
          }

          if (i === symbols.length - 1 || allEpsilon) {
            for (const f of follow[lhs]) {
              followAdded.add(f);
            }
          }

          const prevSize = follow[B].size;
          for (const f of followAdded) {
            follow[B].add(f);
          }
          if (follow[B].size > prevSize) {
            changed = true;
          }
        }
      }
    }
  }

  return follow;
}

function displayFollowSets(follow) {
  let output = "FOLLOW Sets:\n";
  for (const nt in follow) {
    output += `FOLLOW(${nt}) = { ${Array.from(follow[nt]).join(", ")} }\n`;
  }
  return output;
}

// function for left factoring
function leftFactoring(grammar) {
  const result = {};

  for (const nt in grammar) {
    const productions = grammar[nt];
    const prefixMap = {};

    // Group productions by their first word
    for (const prod of productions) {
      const firstWord = prod.split(" ")[0];
      if (!prefixMap[firstWord]) prefixMap[firstWord] = [];
      prefixMap[firstWord].push(prod);
    }

    let newProds = [];
    let count = 1;

    for (const prefix in prefixMap) {
      const group = prefixMap[prefix];
      if (group.length === 1) {
        newProds.push(group[0]);
      } else {
        const newNt = nt + "_LF" + count++;
        const commonPrefix = getCommonPrefix(group);
        newProds.push(commonPrefix.join(" ") + " " + newNt);

        result[newNt] = group.map(prod => {
          const rest = prod.split(" ").slice(commonPrefix.length).join(" ");
          return rest ? rest : "ε";
        });
      }
    }

    result[nt] = newProds;
  }

  return result;
}

// Helper to find longest common prefix
function getCommonPrefix(strings) {
  if (strings.length === 0) return [];
  const splitStrs = strings.map(str => str.trim().split(" "));
  let prefix = [];

  for (let i = 0; ; i++) {
    const current = splitStrs[0][i];
    if (!current) break;
    if (splitStrs.every(arr => arr[i] === current)) {
      prefix.push(current);
    } else {
      break;
    }
  }

  return prefix;
}

// LL(1) Parsing Table
function generateLL1Table(grammar, firstSets, followSets) {
  const table = {};
  for (const nt in grammar) {
    table[nt] = {};
    for (const production of grammar[nt]) {
      const symbols = production.trim().split(/\s+/);
      const firstProd = computeFirstOfProduction(symbols, firstSets);

      for (const terminal of firstProd) {
        if (terminal !== 'ε') {
          table[nt][terminal] = production;
        }
      }

      if (firstProd.has('ε')) {
        for (const terminal of followSets[nt]) {
          table[nt][terminal] = production;
        }
      }
    }
  }
  return table;
}

function computeFirstOfProduction(symbols, firstSets) {
  const result = new Set();
  for (const sym of symbols) {
    const first = firstSets[sym] || new Set([sym]);
    for (const f of first) {
      if (f !== 'ε') result.add(f);
    }
    if (!first.has('ε')) return result;
  }
  result.add('ε');
  return result;
}

function displayLL1Table(table) {
  let output = "LL(1) Parsing Table:\n";
  const nonTerminals = Object.keys(table);
  const terminals = new Set();
  nonTerminals.forEach(nt => {
    Object.keys(table[nt]).forEach(t => terminals.add(t));
  });

  const termList = Array.from(terminals);
  output += "\t" + termList.join("\t") + "\n";
  for (const nt of nonTerminals) {
    output += nt + "\t";
    for (const t of termList) {
      output += (table[nt][t] || "") + "\t";
    }
    output += "\n";
  }
  return output;
}






function analyze() {
  const input = document.getElementById("inputArea").value.trim();
  if (!input) {
    alert("Please enter grammar.");
    return;
  }

  parseGrammar(input);

  if (currentSection === 'grammar') {
  document.getElementById("outputArea").innerText = "Grammar Loaded Successfully.";
} 
else if (currentSection === 'leftRec') {
  const result = eliminateLeftRecursion(parsedGrammar);
  document.getElementById("outputArea").innerText = displayLeftRecursion(result);
} 
else if (currentSection === 'leftFactoring') {
  const result = leftFactoring(parsedGrammar);
  document.getElementById("outputArea").innerText = displayLeftFactoring(result);
} 
else if (currentSection === 'first') {
  const firstSets = computeFirstSets(parsedGrammar);
  document.getElementById("outputArea").innerText = displayFirstSets(firstSets);
} 
else if (currentSection === 'follow') {
  const firstSets = computeFirstSets(parsedGrammar);
  const followSets = computeFollowSets(parsedGrammar, firstSets, Object.keys(parsedGrammar)[0]);
  document.getElementById("outputArea").innerText = displayFollowSets(followSets);
} 

else if (currentSection === 'll1') {
  const firstSets = computeFirstSets(parsedGrammar);
  const followSets = computeFollowSets(parsedGrammar, firstSets, Object.keys(parsedGrammar)[0]);
  const ll1Table = generateLL1Table(parsedGrammar, firstSets, followSets);
  document.getElementById("outputArea").innerText = displayLL1Table(ll1Table);
}

else {
  document.getElementById("outputArea").innerText = "This feature is not implemented yet.";
}

}
