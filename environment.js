//----------------------
// IMPORTS & ERRORS
//----------------------

import fs from 'fs';
// We import the custom errors you defined and exported in main.js
import { TypeMismatchError, DivisionByZeroError } from './main.js';

//----------------------
// FUNCTIONS
//----------------------

export const FUNCTIONS = Object.create(null);

FUNCTIONS.print = (args) => {
   const formatOutput = (arg) => {
      if (arg && arg.type === "list") {
         let inner = arg.value.map(v => formatOutput(v)).join(" ");
         return `(${inner})`;
      }
      if (typeof arg === "function") {
         return "<function>";
      }
      return ((arg == 67) ? "SIX SEVEN!!!! SIX SEVEN!!! SIX SEVEN!!" : arg);
   };
   
   args = args.map(arg => formatOutput(arg));
   let output = args.join("");
   process.stdout.write(output);
   return output;
};

FUNCTIONS.sin = (args) => Math.sin(args[0]);
FUNCTIONS.cos = (args) => Math.cos(args[0]);
FUNCTIONS.floor = (args) => Math.floor(args[0]);
FUNCTIONS.clear = () => console.clear();

//----------------------
// DATA STRUCTURES
//----------------------

FUNCTIONS.list = (args) => {
   let obj = Object.create(null);
   obj.type = "list";
   obj.value = args; 
   
   obj.add = (args) => {
      obj.value.push(...args);
      return obj.value;  
   };
   
   obj.del = (args) => {
      let amount = args[0] || 1;
      for(let i = 0; i < amount; i++) {
         obj.value.pop(); 
      }
      return obj.value;
   };
   
   obj.get = (args) => {
      let index = args[0];
      if (index >= obj.len || index < 0) {
         throw new RangeError("List index out of bounds");
      }
      return obj.value[index];
   };
   
   obj.set = (args) => {
      let value = args[0];
      let index = args[1];
      if (index >= obj.len || index < 0) {
         throw new RangeError("List index out of bounds");
      }
      obj.value[index] = value;
      return obj.value[index];
   };

   Object.defineProperty(obj, 'len', {
      get: function() {
         return this.value.length;
      }
   });
   
   return obj;
}

//----------------------
// ARITHMETIC OPERATORS
//----------------------

FUNCTIONS["+"] = (args) => args.slice(1).reduce((acc, curr) => {
   if (typeof acc !== "number" && typeof acc !== "string") {
      throw new TypeMismatchError(`Invalid type: the addition operator does not support type '${acc.type ? acc.type : typeof acc}'`);
   }
   if (typeof acc !== typeof curr) {
      throw new TypeMismatchError(`Type mismatch: attempt to add '${curr.type ? curr.type : typeof curr}' to '${acc.type ? acc.type : typeof acc}'`);
   }
   
   
   
   return acc + curr;
}, args[0]);

FUNCTIONS["-"] = (args) => args.reduce((acc, curr) => {
   if(typeof acc !== "number" || typeof curr !== "number") {
      throw new TypeMismatchError("Type mismatch: subtraction requires numbers");
   }
   return acc - curr;
});

FUNCTIONS["*"] = (args) => args.reduce((acc, curr) => {
   if(typeof acc !== "number" || typeof curr !== "number") {
      throw new TypeMismatchError("Type mismatch: multiplication requires numbers");
   }
   return acc * curr;
}, 1);

FUNCTIONS["^"] = (args) => args.reduce((acc, curr) => {
   if(typeof acc !== "number" || typeof curr !== "number") {
      throw new TypeMismatchError("Type mismatch: exponentiation requires numbers");
   }
   return Math.pow(acc, curr);
});

FUNCTIONS["/"] = (args) => {
   return args.reduce((acc, curr) => {
      if(typeof acc !== "number" || typeof curr !== "number") {
         throw new TypeMismatchError("Type mismatch: division requires numbers");
      }
      if (curr === 0) throw new DivisionByZeroError("Division by zero is not allowed");
      return acc / curr;
   });
};

//----------------------
// COMPARISON OPERATORS
//----------------------

let comparisonOperators = ["==", "!=", "<", "<=", ">", ">="];
comparisonOperators.forEach(operator => {
   let functionBody = `
      for (let i = 0; i < args.length - 1; i++) {
         if (!(args[i] ${operator} args[i + 1])) {
            return false; 
         }
      }
      return true;
   `;
   FUNCTIONS[operator] = Function("args", functionBody);
});

//----------------------
// SPECIAL FORMS
//----------------------

export const SPECIAL_FORMS = Object.create(null);
SPECIAL_FORMS.or = (args, env, evaluate) => {
   for (let arg of args) {
      let value = evaluate(arg, env);
      if (value === true) {
         return true; 
      }
   }
   return false;
};

SPECIAL_FORMS.and = (args, env, evaluate) => {
   for (let arg of args) {
      let value = evaluate(arg, env);
      if (value === false) {
         return false; 
      }
   }
   return true;
};

SPECIAL_FORMS.nand = (args, env, evaluate) => !(SPECIAL_FORMS.and(args, env, evaluate));
SPECIAL_FORMS.nor = (args, env, evaluate) => !(SPECIAL_FORMS.or(args, env, evaluate));

FUNCTIONS.not = (args) => {
   if(args.length !== 1) throw new SyntaxError("The 'not' operator requires exactly one argument: not(expression)");
   return !args[0];
};

SPECIAL_FORMS.do = (args, env, evaluate) => {
   let value = false;
   for (let arg of args) {
      value = evaluate(arg, env);
   }
   return value;
}

SPECIAL_FORMS.define = (args, env, evaluate) => {
   if (args.length !== 2 || args[0].type !== "word") {
      throw new SyntaxError("Invalid assignment. Expected: =(name, value)");
   }
   let value = evaluate(args[1], env);
   let inferredType = args[0].valueType;
   
   if (!inferredType) {
      if (typeof value === "object") {
         inferredType = value.type;
      } else {
         inferredType = typeof value;
      }
   } 
   
   if (args[0].valueType && args[0].valueType !== "anything") {
      if (typeof value !== "object" && args[0].valueType !== typeof value) {
         throw new TypeMismatchError(`Type mismatch for variable '${args[0].name}'. Expected '${args[0].valueType}', got '${typeof value}'`);
      }
   }
   delete args[0].valueType;
  
   
   env[args[0].name] = value;
   env[`__type_${args[0].name}`] = inferredType;
   
   return value;
};

SPECIAL_FORMS.set = (args, env, evaluate) => {
   if (args.length !== 2 || args[0].type !== "word") {
      throw new SyntaxError("Invalid assignment. Expected: =(name, value)");
   }
   if (args[0].valueType) {
      throw new SyntaxError(`Cannot specify a type when updating a variable! Remove the type annotation from '${args[0].name}'.`);
   }
   
   let varName = args[0].name;
   let targetEnv = env;
   
   while (targetEnv && !Object.prototype.hasOwnProperty.call(targetEnv, varName)) {
      targetEnv = Object.getPrototypeOf(targetEnv);
   }

   if (!targetEnv) throw new ReferenceError(`Undefined variable: '${varName}'`);

   let value = evaluate(args[1], env);
   let oldValue = targetEnv[varName];
   let declaredType = targetEnv[`__type_${varName}`];

   if (declaredType !== "anything") {
      if (typeof value !== "object" && declaredType !== typeof value) {
         throw new TypeMismatchError(`Type mismatch for variable '${varName}' of type '${declaredType}' with value: ${value} of type '${typeof value}'`);
      } else if (typeof value === "object" && oldValue.type !== value.type) {
         throw new TypeMismatchError(`Type mismatch for object '${varName}'`);
      }
   }
   
   targetEnv[varName] = value;
   return value;
};

SPECIAL_FORMS["="] = (args, env, evaluate) => {
   
   if (args[0].valueType) {
      console.log(args[0])
      return SPECIAL_FORMS.define(args, env, evaluate);
   }
   if (args[0].name in env) {
      return SPECIAL_FORMS.set(args, env, evaluate);
   } else {
      return SPECIAL_FORMS.define(args, env, evaluate);
   }
};

SPECIAL_FORMS["++"] = (args, env, evaluate, parse, step = 1) => {
   if(!args.length) return 1 * step;
   
   args.forEach(arg => {
      let currentValue = evaluate(arg, env);
      
      if (typeof currentValue !== "number") {
         throw new TypeMismatchError(`Variable '${arg.name}' is not of type 'number', cannot modify value`);
      }
      let newValueNode = { type: "value", value: currentValue + step };
      SPECIAL_FORMS.set([arg, newValueNode], env, evaluate);
   });
   
   let values = args.map(arg => evaluate(arg, env));
   if (values.length === 1) return values[0];
   
   return values;
};

SPECIAL_FORMS["--"] = (args, env, evaluate, parse) => SPECIAL_FORMS["++"](args, env, evaluate, parse, -1);

SPECIAL_FORMS.if = (args, env, evaluate) => {
   let condition = evaluate(args[0], env);
   if(args.length === 3){
      if (condition !== false && condition !== 0 && condition !== "") {
         return evaluate(args[1], env);
      } else {
         return evaluate(args[2], env);
      }
   }
   else if(args.length === 2){
      if (condition !== false && condition !== 0 && condition !== "") {
         return evaluate(args[1], env);
      } else {
         return false;
      }
   }
   else {
      throw new SyntaxError("Invalid 'if' usage. Expected: if(condition, true_branch, [false_branch])");
   }  
};

SPECIAL_FORMS.while = (args, env, evaluate, parse) => {
   if (args.length !== 2) {
      throw new SyntaxError("Invalid 'while' usage. Expected: while(condition, body)");
   }
   while (evaluate(args[0], env) !== false) {
      evaluate(args[1], env);
   }
   return false;
}

SPECIAL_FORMS.for = (args, env, evaluate) => {
   if (args.length !== 4) {
      throw new SyntaxError("Invalid 'for' usage. Expected: for(initialization; condition; step; body)");
   }
   let localEnv = Object.create(env);
   evaluate(args[0], localEnv);
   
   while (evaluate(args[1], localEnv) !== false) {
      evaluate(args[3], localEnv);
      evaluate(args[2], localEnv);
   }

   return false;
};

SPECIAL_FORMS.func = (args, env, evaluate) => {
   if(!args.length) {
      throw new SyntaxError("Function requires a body: func(...args, body)");
   }
   
   let body = args[args.length-1];
   let params = args.slice(0, args.length-1).map(expr => {
      if (expr.type != "word") {
         throw new SyntaxError("Function parameter names must be valid variables");
      }
      return expr.name;
   });
   
   return function(args) {
      if(args.length != params.length) {
         throw new TypeError(`Incorrect number of arguments. Expected ${params.length}, got ${args.length}`);
      }
      let localEnv = Object.create(env);
      for (let i = 0; i < args.length; i++){
         localEnv[params[i]] = args[i];
      }
      return evaluate(body, localEnv);
   }
}

SPECIAL_FORMS.import = (args, env, evaluate, parse) => {
   if (args.length !== 1) {
      throw new SyntaxError("The 'import' function requires exactly one argument: import(file_path)");
   }

   let filename = evaluate(args[0], env);
   if (typeof filename !== "string") {
      throw new TypeError("The file path in the 'import' function must be a string.");
   }

   try {
      let fileContent = fs.readFileSync(filename, 'utf8');
      let moduleEnv = Object.create(VARIABLES);
      let parsedModule = parse(`do(${fileContent})`);

      evaluate(parsedModule, moduleEnv);
      return moduleEnv;

   } catch (error) {
      throw new Error(`Critical error importing module '${filename}': ${error.message}`);
   }
};

//----------------------
// BUILT-IN VARIABLES
//----------------------

export const VARIABLES = Object.create(null);

VARIABLES.true = true;
VARIABLES.false = false;

//----------------------
// PRIMITIVE TYPE METHODS
//----------------------

export const TYPE_METHODS = {
   string: {
      repeat: (val, args) => {
         if(args.length !== 1) throw new SyntaxError("Method 'repeat' requires exactly 1 argument");
         return val.repeat(args[0]);
      },
      replace: (val, args) => {
         if(args.length !== 2) throw new SyntaxError("Method 'replace' requires exactly 2 arguments: replace(search, replacement)");
         return val.replaceAll(args[0], args[1]);
      },
      contains: (val, args) => val.includes(args[0]),       
      startsWith: (val, args) => val.startsWith(args[0]),   
      endsWith: (val, args) => val.endsWith(args[0]),       
      padStart: (val, args) => val.padStart(args[0], args[1] || " ") 
   },
   number: {
      
   }
};

export const TYPE_PROPERTIES = {
   string: {
      lower: (val, args) => val.toLowerCase(),
      upper: (val, args) => val.toUpperCase(),
      len: (val) => val.length,
      trim: (val) => val.trim(),            
      isEmpty: (val) => val.length === 0,
      reverse: (val) => val.split('').reverse().join(''),
      capitalize: (val) => val.charAt(0).toUpperCase() + val.slice(1).toLowerCase()
   },
   number: {
      isEven: (val) => val % 2 === 0,
      isOdd: (val) => val % 2 !== 0,
      sNotation: (val) => val.toExponential().replace(/e\+?/, ' * 10^'),
      bin: (val) => val.toString(2),
      oct: (val) => val.toString(8),
      hex: (val) => val.toString(16),
      abs: (val) => Math.abs(val),       
      round: (val) => Math.round(val),   
      floor: (val) => Math.floor(val),   
      ceil: (val) => Math.ceil(val),     
      sign: (val) => Math.sign(val),     
      isInt: (val) => Number.isInteger(val) 
   }
};