import assert from 'assert';
import { interprete } from './main.js';
import fs from 'fs';

const testModuleName = "temp_test_module.txt";
const testModuleContent = `
   =(secretNumber:num, 42);
   =(double, func(x, *(x, 2)));
`;
fs.writeFileSync(testModuleName, testModuleContent);

const regression_tests = [
   // ==========================================
   // 1. MATHEMATICS (Basics and Edge Cases)
   // ==========================================
// --- ADDITION (+) ---
   { name: "Adding multiple arguments", code: "+(1, 2, 3, 4, 5)", expected: 15 },
   { name: "Adding single argument", code: "+(1)", expected: 1 },
   { name: "String concatenation via addition", code: "+(\"hello \", \"world\")", expected: "hello world" },
   { name: "Adding number and string (Error)", code: "+(1, \"d\")", expectedError: "Type mismatch: attempt to add 'string' to 'number'" },
   { name: "Adding string and number (Error)", code: "+(\"d\", 1)", expectedError: "Type mismatch: attempt to add 'number' to 'string'" },
   { name: "Adding number and list (Error)", code: "+(1, list(1))", expectedError: "Type mismatch: attempt to add 'list' to 'number'" },
   { name: "Adding unsupported type boolean (Error)", code: "+(true, 1)", expectedError: "Invalid type: the addition operator does not support type 'boolean'" },

   // --- SUBTRACTION (-) ---
   { name: "Subtraction with positive result", code: "-(20, 5, 3)", expected: 12 },
   { name: "Subtraction with negative result", code: "-(5, 15)", expected: -10 },
   { name: "Parsing negative numbers", code: "+(-5, -10)", expected: -15 }, 
   { name: "Subtraction single argument (Identity)", code: "-(5)", expected: 5 },
   { name: "Subtraction type mismatch with string (Error)", code: "-(10, \"a\")", expectedError: "Type mismatch: subtraction requires numbers" },
   { name: "Subtraction type mismatch with boolean (Error)", code: "-(true, 5)", expectedError: "Type mismatch: subtraction requires numbers" },

   // --- MULTIPLICATION (*) ---
   { name: "Multiplication multiple arguments", code: "*(2, 3, 4)", expected: 24 },
   { name: "Multiplication by zero", code: "*(5, 0, 10)", expected: 0 },
   { name: "Multiplication single argument", code: "*(5)", expected: 5 },
   { name: "Multiplication with no arguments (Identity)", code: "*()", expected: 1 },
   { name: "Multiplication type mismatch (Error)", code: "*(5, \"test\")", expectedError: "Type mismatch: multiplication requires numbers" },

   // --- DIVISION (/) ---
   { name: "Division with whole result", code: "/(100, 5, 2)", expected: 10 },
   { name: "Division with float result", code: "/(10, 4)", expected: 2.5 },
   { name: "Division single argument", code: "/(5)", expected: 5 },
   { name: "Division by zero directly (Error)", code: "/(10, 0)", expectedError: "Division by zero is not allowed" },
   { name: "Division by zero in chain (Error)", code: "/(10, 2, 0)", expectedError: "Division by zero is not allowed" },
   { name: "Division type mismatch (Error)", code: "/(10, \"a\")", expectedError: "Type mismatch: division requires numbers" },

   // --- EXPONENTIATION (^) ---
   { name: "Exponentiation basic", code: "^(2, 3)", expected: 8 },
   { name: "Exponentiation to zero", code: "^(5, 0)", expected: 1 },
   { name: "Nested exponentiation", code: "^(2, ^(2, 2))", expected: 16 },
   { name: "Exponentiation with negative power", code: "^(2, -2)", expected: 0.25 },
   { name: "Exponentiation single argument", code: "^(5)", expected: 5 },
   { name: "Exponentiation type mismatch (Error)", code: "^(2, \"a\")", expectedError: "Type mismatch: exponentiation requires numbers" },

   // --- MIXED & FLOATS ---
   { name: "Complex order of operations", code: "-(*(+(2, 3), 4), /(10, 2))", expected: 15 }, 
   { name: "Floating-point mathematics", code: "*(0.5, 4)", expected: 2 },
   
   // ==========================================
   // 2. LOGIC AND COMPARISONS
   // ==========================================
// --- CHAINED COMPARISONS ---
   { name: "Chained less than (True)", code: "<(1, 5, 10, 20)", expected: true },
   { name: "Chained less than (False)", code: "<(1, 5, 3, 20)", expected: false },
   { name: "Chained greater than (True)", code: ">(100, 50, 0, -10)", expected: true },
   { name: "Chained greater than (False)", code: ">(100, 50, 60, -10)", expected: false },
   { name: "Chained less than or equal (True)", code: "<=(5, 5, 10, 10)", expected: true },
   { name: "Chained greater than or equal (True)", code: ">(10, 10, 5, -1)", expected: true },
   { name: "Chained equality multiple matches (True)", code: "==(42, 42, 42, 42)", expected: true },
   { name: "Chained equality mismatch (False)", code: "==(42, 42, 99, 42)", expected: false },
   { name: "Chained inequality (True)", code: "!=(1, 2, 3, 4)", expected: true },
   { name: "Chained inequality (False)", code: "!=(1, 2, 2, 4)", expected: false },
   { name: "String comparison equality", code: "==(\"test\", \"test\")", expected: true },
   { name: "String comparison inequality", code: "!=(\"apple\", \"banana\")", expected: true },
   { name: "Comparison edge case: single argument", code: "<(42)", expected: true },
   { name: "Comparison edge case: no arguments", code: "==()", expected: true },

   // --- BASIC LOGICAL OPERATORS ---
   { name: "AND all true", code: "and(true, true, true)", expected: true },
   { name: "AND with one false", code: "and(true, false, true)", expected: false },
   { name: "AND empty arguments evaluation", code: "and()", expected: true },
   { name: "OR all false", code: "or(false, false, false)", expected: false },
   { name: "OR with one true", code: "or(false, true, false)", expected: true },
   { name: "OR empty arguments evaluation", code: "or()", expected: false },
   { name: "NAND basic true combination", code: "nand(true, true)", expected: false },
   { name: "NAND basic false combination", code: "nand(true, false)", expected: true },
   { name: "NOR basic true combination", code: "nor(false, true)", expected: false },
   { name: "NOR basic false combination", code: "nor(false, false)", expected: true },
   { name: "NOT true expression", code: "not(true)", expected: false },
   { name: "NOT false expression", code: "not(false)", expected: true },
   { name: "Complex nested AND/OR/NOT logic", code: "or(and(true, false), not(nor(true, false)))", expected: true },
   { name: "Nested double negation", code: "not(not(true))", expected: true },

   // --- SHORT-CIRCUIT EVALUATION PROOF ---
   { name: "AND short-circuit: stops on first false", code: "=(x:num, 0); and(false, ++(x)); x", expected: 0 },
   { name: "AND no short-circuit: evaluates all if true", code: "=(x:num, 0); and(true, ++(x)); x", expected: 1 },
   { name: "OR short-circuit: stops on first true", code: "=(x:num, 0); or(true, ++(x)); x", expected: 0 },
   { name: "OR no short-circuit: evaluates all if false", code: "=(x:num, 0); or(false, ++(x)); x", expected: 1 },
   { name: "NAND short-circuit propagation", code: "=(x:num, 0); nand(false, ++(x)); x", expected: 0 },
   { name: "NOR short-circuit propagation", code: "=(x:num, 0); nor(true, ++(x)); x", expected: 0 },

   // --- STRICT TYPE EVALUATION IN LOGIC ---
   { name: "AND strict evaluation: numbers are not strictly false", code: "and(1, 2, 0)", expected: true },
   { name: "OR strict evaluation: numbers are not strictly true", code: "or(0, 1, false)", expected: false },

   // --- LOGICAL OPERATOR ERRORS ---
   { name: "NOT with missing argument (Error)", code: "not()", expectedError: "The 'not' operator requires exactly one argument: not(expression)" },
   { name: "NOT with too many arguments (Error)", code: "not(true, false)", expectedError: "The 'not' operator requires exactly one argument: not(expression)" },

   // ==========================================
   // 3. VARIABLES, TYPING AND SCOPE
   // ==========================================
   { name: "Variable declaration (num)", code: "=(x:num, 10); x", expected: 10 },
   { name: "Variable update", code: "=(y:num, 5); =(y, 15); y", expected: 15 },
   { name: "Arithmetic shortcuts", code: "=(z:num, 1); ++(z); z", expected: 2 },
   { name: "Decrement below zero", code: "=(z:num, 0); --(z); z", expected: -1 },
   { name: "Type 'any' on the fly", code: "=(a:any, 5); =(a, list(1, 2)); a.len", expected: 2 },
   { name: "Variable shadowing in functions", code: "=(x:num, 10); =(f, func(x, +(x, 5))); f(20)", expected: 25 },
   { name: "Nested DO block and Scope", code: "=(x:num, 1); do(=(x, 2), =(y:num, 3)); x", expected: 2 },
   { name: "FOR loop scope isolation", code: "=(i:num, 99); for(=(i:num, 0); <(i, 2); ++(i); 1); i", expected: 99 },

   // ==========================================
   // 4. CONTROL FLOW
   // ==========================================
   { name: "IF statement (True branch)", code: "if(true, 100, 200)", expected: 100 },
   { name: "IF statement (False branch)", code: "if(false, 100, 200)", expected: 200 },
   { name: "Nested IF", code: "if(>(10, 5), if(==(1, 1), 42, 0), 0)", expected: 42 },
   { name: "Missing false branch in IF", code: "if(false, 100)", expected: false }, 
   { name: "Empty DO statement", code: "do()", expected: false },
   { name: "WHILE loop", code: "=(i:num, 0); while(<(i, 5), ++(i)); i", expected: 5 },
   { name: "WHILE loop (Skip - false on start)", code: "=(x:num, 0); while(false, ++(x)); x", expected: 0 },
   { name: "Nested WHILE loop", code: "=(i:num,0); =(sum:num,0); while(<(i,3), do(=(j:num,0), while(<(j,3), do(++(sum), ++(j))), ++(i))); sum", expected: 9 },

   // ==========================================
   // 5. FUNCTIONS AND CLOSURES
   // ==========================================
// --- IF STATEMENT TRUTHINESS & BRANCHING ---
   { name: "IF statement (True branch)", code: "if(true, 100, 200)", expected: 100 },
   { name: "IF statement (False branch)", code: "if(false, 100, 200)", expected: 200 },
   { name: "Nested IF conditional routing", code: "if(>(10, 5), if(==(1, 1), 42, 0), 0)", expected: 42 },
   { name: "Missing false branch in IF defaults to false", code: "if(false, 100)", expected: false }, 
   { name: "IF truthiness: Positive integer is truthy", code: "if(10, \"truthy\", \"falsy\")", expected: "truthy" },
   { name: "IF truthiness: Empty string is falsy", code: "if(\"\", \"truthy\", \"falsy\")", expected: "falsy" },
   { name: "IF truthiness: Zero integer is falsy", code: "if(0, \"truthy\", \"falsy\")", expected: "falsy" },

   // --- DO BLOCKS ---
   { name: "Empty DO statement returns false", code: "do()", expected: false },
   { name: "DO block returns value of last executed expression", code: "do(=(x:num, 2), ++(x), *(x, 5))", expected: 15 },

   // --- WHILE LOOPS & SCOPE BLEEDING ---
   { name: "WHILE loop basic execution counter", code: "=(i:num, 0); while(<(i, 5), ++(i)); i", expected: 5 },
   { name: "WHILE loop (Skip - false condition on start)", code: "=(x:num, 0); while(false, ++(x)); x", expected: 0 },
   { name: "Nested WHILE loop structural test", code: "=(i:num,0); =(sum:num,0); while(<(i,3), do(=(j:num,0), while(<(j,3), do(++(sum), ++(j))), ++(i))); sum", expected: 9 },
   { name: "WHILE loop variable bleeding (No local scope isolation)", code: "=(x:num, 1); while(<(x, 2), do(=(innerBleed:num, 500), ++(x))); innerBleed", expected: 500 },

   // --- FOR LOOPS & LEXICAL ENVIRONMENT ISOLATION ---
   { name: "FOR loop basic iteration", code: "=(sum:num, 0); for(=(i:num, 0); <(i, 5); ++(i); =(sum, +(sum, 1))); sum", expected: 5 },
   { name: "FOR loop scope isolation (Iterator cannot leak out)", code: "=(i:num, 99); for(=(i:num, 0); <(i, 2); ++(i); 1); i", expected: 99 },
   { name: "Nested FOR loops with deep iterator shadowing", code: "=(sum:num, 0); for(=(i:num, 0); <(i, 2); ++(i); for(=(i:num, 0); <(i, 3); ++(i); =(sum, +(sum, 1)))); sum", expected: 6 },
   { name: "FOR loop updating an explicitly declared outer variable", code: "=(out:num, 10); for(=(i:num, 0); <(i, 3); ++(i); =(out, +(out, 1))); out", expected: 13 },

   // --- COMPLEX MIXED CONTROL FLOW ---
   { name: "FOR loop running inside a WHILE loop", code: "=(w:num, 0); =(total:num, 0); while(<(w, 2), do(for(=(i:num, 0); <(i, 3); ++(i); =(total, +(total, 1))), ++(w))); total", expected: 6 },
   { name: "WHILE loop running inside a FOR loop", code: "=(total:num, 0); for(=(i:num, 0); <(i, 2); ++(i); do(=(j:num, 0), while(<(j, 3), do(++(total), ++(j))))); total", expected: 6 },
   { name: "IF statement mutating outer state inside a WHILE condition", code: "=(x:num, 0); =(y:num, 0); while(<(x, 3), do(++(x), if(==(x, 2), =(y, 99)))); y", expected: 99 },

   // --- CONTROL FLOW ERRORS ---
   { name: "IF with missing argument constraints (Error)", code: "if(true)", expectedError: "Invalid 'if' usage. Expected: if(condition, true_branch, [false_branch])" },
   { name: "IF with bloated argument layout (Error)", code: "if(true, 1, 2, 3)", expectedError: "Invalid 'if' usage. Expected: if(condition, true_branch, [false_branch])" },
   { name: "WHILE with missing parameters (Error)", code: "while(true)", expectedError: "Invalid 'while' usage. Expected: while(condition, body)" },
   { name: "WHILE with overflowing parameters (Error)", code: "while(true, 1, 2)", expectedError: "Invalid 'while' usage. Expected: while(condition, body)" },
   { name: "FOR with unaligned parameters constraint (Error)", code: "for(=(i:num,0); <(i,2); ++(i))", expectedError: "Invalid 'for' usage. Expected: for(initialization; condition; step; body)" },

   // ==========================================
   // 6. LISTS AND DATA STRUCTURES
   // ==========================================
// --- BASIC CREATION & RETRIEVAL ---
   { name: "List creation and retrieval", code: "=(l:list, list(10, 20)); l.get(1)", expected: 20 },
   { name: "Empty list creation has zero length", code: "=(l:list, list()); l.len", expected: 0 },
   { name: "Single item list retrieval", code: "=(l:list, list(42)); l.get(0)", expected: 42 },
   { name: "List storing mixed primitive types", code: "=(l:list, list(1, \"two\", true)); l.get(1).len", expected: 3 },

   // --- MUTATIONS ---
   { name: "Adding single element to list", code: "=(l:list, list()); l.add(99); l.get(0)", expected: 99 },
   { name: "Adding multiple elements dynamically", code: "=(l:list, list(1)); l.add(2, 3, 4); l.len", expected: 4 },
   { name: "Verifying value after multiple dynamic adds", code: "=(l:list, list(1)); l.add(2, 3, 4); l.get(3)", expected: 4 },
   { name: "Updating list value via set", code: "=(l:list, list(10, 20)); l.set(99, 1); l.get(1)", expected: 99 },
   { name: "Removing last element via default del", code: "=(l:list, list(1, 2, 3)); l.del(); l.len", expected: 2 },
   { name: "Removing multiple elements via specified del count", code: "=(l:list, list(1, 2, 3, 4)); l.del(2); l.len", expected: 2 },
   { name: "Deleting down to an empty list", code: "=(l:list, list(10)); l.del(1); l.len", expected: 0 },
   { name: "Over-deleting from list safely handles floor boundary", code: "=(l:list, list(10)); l.del(5); l.len", expected: 0 },

   // --- MULTIDIMENSIONAL STRUCTURES & MATRIX OPERATIONS ---
   { name: "Multidimensional lists (2D Matrix Retrieval)", code: "=(l:list, list(list(1, 2), list(3, 4))); l.get(1).get(0)", expected: 3 },
   { name: "Deeply nested lists (3D Matrix Retrieval)", code: "=(l:list, list(list(list(99)))); l.get(0).get(0).get(0)", expected: 99 },
   { name: "Mutating a nested matrix internally via set", code: "=(m:list, list(list(10, 20), list(30, 40))); m.get(0).set(99, 1); m.get(0).get(1)", expected: 99 },

   // --- HIGH-ORDER DATA STRUCTURES ---
   { name: "Executing a closure function stored inside a list (IIFE-style)", code: "=(l:list, list(func(x, *(x, 10)))); l.get(0)(3)", expected: 30 },
   { name: "Passing a dynamically generated list into a function", code: "=(getFirst, func(lst, lst.get(0))); getFirst(list(77, 88))", expected: 77 },

   // --- DATA STRUCTURE ERRORS ---
   { name: "Retrieving negative index (Error)", code: "=(l:list, list(1, 2)); l.get(-1)", expectedError: "List index out of bounds" },
   { name: "Retrieving index exactly equal to length (Error)", code: "=(l:list, list(1, 2)); l.get(2)", expectedError: "List index out of bounds" },
   { name: "Retrieving index way beyond maximum length (Error)", code: "=(l:list, list(1, 2)); l.get(100)", expectedError: "List index out of bounds" },
   { name: "Setting value at negative index (Error)", code: "=(l:list, list(1, 2)); l.set(99, -1)", expectedError: "List index out of bounds" },
   { name: "Setting value at index exactly equal to length (Error)", code: "=(l:list, list(1, 2)); l.set(99, 2)", expectedError: "List index out of bounds" },

// ==========================================
   // 7. PRIMITIVE METHODS AND PROPERTIES 
   // ==========================================
   // --- STRING PROPERTIES & METHODS ---
   { name: "String method (upper)", code: "=(s:str, \"hey\"); s.upper", expected: "HEY" },
   { name: "String property (len)", code: "=(s:str, \"test\"); s.len", expected: 4 },
   { name: "String method with argument (repeat)", code: "=(s:str, \"a\"); s.repeat(3)", expected: "aaa" },
   { name: "String method with multiple arguments (replace)", code: "=(s:str, \"banana\"); s.replace(\"a\", \"o\")", expected: "bonono" },
   { name: "String boolean query (contains - True)", code: "=(s:str, \"javascript\"); s.contains(\"script\")", expected: true },
   { name: "String boolean query (contains - False)", code: "=(s:str, \"javascript\"); s.contains(\"python\")", expected: false },
   { name: "String boundary checking (startsWith)", code: "=(s:str, \"compiler\"); s.startsWith(\"comp\")", expected: true },
   { name: "String boundary checking (endsWith)", code: "=(s:str, \"interpreter\"); s.endsWith(\"ter\")", expected: true },
   { name: "String padding modification (padStart)", code: "=(s:str, \"5\"); s.padStart(3, \"0\")", expected: "005" },
   { name: "String utility check (isEmpty)", code: "=(s:str, \"\"); s.isEmpty", expected: true },
   { name: "String transformation (reverse)", code: "=(s:str, \"cyc\"); s.reverse", expected: "cyc" },

   // --- ADVANCED STRING METHOD/PROPERTY CHAINING ---
   { name: "Chaining properties and methods interchangeably", code: "=(s:str, \"  cyc  \"); s.trim.capitalize.repeat(2)", expected: "CycCyc" },
   { name: "Chaining methods ending with a property lookup", code: "=(s:str, \"abc\"); s.upper.repeat(3).len", expected: 9 },

   // --- NUMBER PROPERTIES ---
   { name: "Number parity property (isEven)", code: "=(n:num, 4); n.isEven", expected: true },
   { name: "Number parity property (isOdd)", code: "=(n:num, 7); n.isOdd", expected: true },
   { name: "Number math conversion (abs)", code: "=(n:num, -5.5); n.abs", expected: 5.5 },
   { name: "Number math rounding (floor)", code: "=(n:num, 5.9); n.floor", expected: 5 },
   { name: "Number math rounding (ceil)", code: "=(n:num, 5.1); n.ceil", expected: 6 },
   { name: "Number type verification (isInt - True)", code: "=(n:num, 42); n.isInt", expected: true },
   { name: "Number type verification (isInt - False)", code: "=(n:num, 42.42); n.isInt", expected: false },
   { name: "Number radix conversion (bin)", code: "=(n:num, 10); n.bin", expected: "1010" },
   { name: "Number radix conversion (hex)", code: "=(n:num, 255); n.hex", expected: "ff" },
   { name: "Number scientific notation string parsing", code: "=(n:num, 5000); n.sNotation", expected: "5 * 10^3" },
   { name: "Chaining arithmetic properties sequentially", code: "=(n:num, -5.5); n.abs.floor", expected: 5 },

   // --- PRIMITIVE ERRORS ---
   { name: "Invoking a missing property on string (Error)", code: "=(s:str, \"hello\"); s.abs", expectedError: "Property 'abs' does not exist on type 'string'" },
   { name: "Invoking a missing property on number (Error)", code: "=(n:num, 10); n.upper", expectedError: "Property 'upper' does not exist on type 'number'" },
   { name: "String repeat method missing required argument (Error)", code: "=(s:str, \"a\"); s.repeat()", expectedError: "Method 'repeat' requires exactly 1 argument" },
   { name: "String replace method missing argument constraint (Error)", code: "=(s:str, \"a\"); s.replace(\"a\")", expectedError: "Method 'replace' requires exactly 2 arguments" },

   // ==========================================
   // 8. MODULES AND IMPORTS
   // ==========================================
   { name: "File import and variable reading", code: `=(mod, import("${testModuleName}")); mod.secretNumber`, expected: 42 },
   { name: "Calling a function from an imported module", code: `=(mod, import("${testModuleName}")); mod.double(10)`, expected: 20 },
   { name: "Accessing non-existent variable in module returns undefined", code: `=(mod, import("${testModuleName}")); mod.ghostVariable`, expected: undefined },
   
   // --- MODULE ERRORS ---
   { name: "Import function missing argument constraints (Error)", code: "import()", expectedError: "The 'import' function requires exactly one argument: import(file_path)" },
   { name: "Import function type mismatch on parameter path (Error)", code: "import(42)", expectedError: "The file path in the 'import' function must be a string." },
   { name: "Importing a non-existent file triggers critical fallback (Error)", code: "import(\"fake_file_name.cyc\")", expectedError: "Critical error importing module" },

   // ==========================================
   // 9. INPUT/OOUTPUT 
   // ==========================================
   // --- PRIMITIVE VALUES ---
   { name: "Print primitive integer number", code: "print(42)", expected: "42" },
   { name: "Print primitive negative float number", code: "print(-3.14)", expected: "-3.14" },
   { name: "Print boolean true constant", code: "print(true)", expected: "true" },
   { name: "Print boolean false constant", code: "print(false)", expected: "false" },
   { name: "Print basic string value", code: "print(\"hello\")", expected: "hello" },
   { name: "Print empty string value", code: "print(\"\")", expected: "" },

   // --- MULTIPLE ARGUMENTS (Concatenation via Print) ---
   { name: "Print multiple mixed arguments in a single call", code: "print(\"x = \", 5, \" is \", true)", expected: "x = 5 is true" },
   { name: "Print empty call with no arguments evaluation", code: "print()", expected: "" },

   // --- DATA STRUCTURE REPRESTENTATIONS ---
   { name: "Print empty list representation", code: "print(list())", expected: "()" },
   { name: "Print simple flat list representation", code: "print(list(1, 2, 3))", expected: "(1 2 3)" },
   { name: "Print nested multidimensional 2D list representation", code: "print(list(list(1, 2), list(3, 4)))", expected: "((1 2) (3 4))" },
   { name: "Print deeply nested 3D list representation", code: "print(list(list(list(99))))", expected: "(((99)))" },
   { name: "Print list containing mixed data types", code: "print(list(1, \"two\", false))", expected: "(1 two false)" },

   // --- CLOSURES & EVALUATIONS ---
   { name: "Print uninvoked function lexical representation", code: "=(f, func(x, x)); print(f)", expected: "<function>" },
   { name: "Print function invocation evaluation output", code: "=(f, func(x, +(x, 10))); print(f(5))", expected: "15" },
   { name: "Print return output value of a nested DO expression block", code: "print(do(1, 2, 3))", expected: "3" },

   // --- SPECIAL SYSTEM RULES & EASTER EGGS ---
   { name: "Print internal custom Easter Egg trigger constraint (Rule 67)", code: "print(67)", expected: "SIX SEVEN!!!! SIX SEVEN!!! SIX SEVEN!!" },
   { name: "Print list containing the custom Easter Egg value", code: "print(list(1, 67, 2))", expected: "(1 SIX SEVEN!!!! SIX SEVEN!!! SIX SEVEN!! 2)" }
];
   
function testing(tests) {
   let passed = 0;
   let failed = 0;
   let failedNames = [];
   const originalWrite = process.stdout.write;
   
   tests.forEach(test => {
      try {
         process.stdout.write = () => {}; 
         let result = interprete(test.code);
         process.stdout.write = originalWrite; 

         if (test.expectedError) {
             console.log(`❌ FAILED: ${test.name} (Expected an error, but got: ${result})`);
             failed++;
             return;
         }
         
         assert.deepStrictEqual(result, test.expected);
         console.log(`✅ PASSED: ${test.name}`);
         passed++;
         
      } catch (error) {
         process.stdout.write = originalWrite;
         
         if (test.expectedError && error.message.includes(test.expectedError)) {
             console.log(`✅ PASSED (Error caught): ${test.name}`);
             passed++;
         } else {
             console.log(`❌ FAILED: ${test.name}`);
             console.log(`   Expected: ${test.expectedError || test.expected}`);
             console.log(`   Error: ${error.message}`);
             failed++;
             failedNames.push(`\n${test.name}`);
         }
      }
   });
   process.stdout.write = originalWrite;
   console.log("\n--- SUMMARY ---");
   console.log(`PASSED: ${passed}`);
   console.log(`FAILED: ${failed}`);
   console.log(failedNames.length > 0 ? `List of Failed Tests: ${failedNames.join("")}` : "");

   if (failed > 0) {
      process.exit(1); 
   } else {
      console.log("WORKS!!!");
   }
   
   if (fs.existsSync(testModuleName)) {
      fs.unlinkSync(testModuleName);
   }
}

const unit_tests = [

]

testing(regression_tests);
//testing(unit_tests);