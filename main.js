#!/usr/bin/env node

import fs from 'fs';
import { FUNCTIONS, SPECIAL_FORMS, VARIABLES, TYPE_METHODS, TYPE_PROPERTIES } from './environment.js';

// ==========================================
// CUSTOM ERRORS
// ==========================================
export class SyntaxError extends Error {
   constructor(message) {
      super(message);
      this.name = "SyntaxError";
   }
}

export class TypeMismatchError extends Error {
   constructor(message) {
      super(message);
      this.name = "TypeMismatchError";
   }
}

export class DivisionByZeroError extends Error {
   constructor(message) {
      super(message);
      this.name = "DivisionByZeroError";
   }
}
export class ValueError extends Error {
   constructor(message) {
       super(message);
       this.name = "ValueError";
   }
}

// ==========================================
// PARSER
// ==========================================
function skipSpace(string) {
   let skippable = string.match(/^(\s|#.*)*/);
   return string.slice(skippable[0].length);
}

function parseExpression(program) {
   program = skipSpace(program);
   let match, expr;
   
   if (match = /^"([^"]*)"/.exec(program)) {
      expr = {type: "value", value: match[1].replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r').replace(/\\x1b/g, '\x1b')};
   } else if (match = /^-?\d+(\.\d+)?\b/.exec(program)) {
      expr = {type: "value", value: Number(match[0])};
      
   } else if (match = /^([^\s(),#":.]+)(?::([a-zA-Z0-9_]+))?/.exec(program)) {
      
      let fullName = match[1]; 
      
      if (fullName.includes(".")) {
         let parts = fullName.split(".");
         expr = {
            type: "property", 
            object: parts[0],
            property: parts[1] 
         };
      } else {
         expr = {type: "word", name: fullName};
      }
      
      if (match[2]) {
         switch(match[2]){
            case "bool": expr.valueType = "boolean"; break;
            case "str": expr.valueType = "string"; break;
            case "num": expr.valueType = "number"; break;
            case "func": expr.valueType = "function"; break;
            case "list": expr.valueType = "list"; break;
            case "any": expr.valueType = "anything"; break;
            default:
               throw new SyntaxError(`Unknown type annotation: '${match[2]}'`);
         }
      }
      
   } else {
      throw new SyntaxError(`Invalid syntax: ${program}`);
   }
   return parseApply(expr, program.slice(match[0].length));
}

function parseApply(expr, program) {
   program = skipSpace(program);
   if (program[0] === "(") {
      program = skipSpace(program.slice(1));
      expr = {type: "apply", operator: expr, args: []};
      while (program[0] !== ")") {
         let arg = parseExpression(program);
         expr.args.push(arg.expr);
         program = skipSpace(arg.rest);
         if (program[0] === "," || program[0] === ";") {
            program = skipSpace(program.slice(1));
         } else if (program[0] !== ")") {
            throw new SyntaxError("Expected ',', ';', or ')'");
         }
      }
      return parseApply(expr, program.slice(1));
   } 
   else if (program[0] === ".") {
      program = skipSpace(program.slice(1));
      let match = /^[a-zA-Z_]\w*/.exec(program);
      if (!match) {
         throw new SyntaxError("Expected a property name after '.'");
      }
      expr = {type: "property", object: expr, property: match[0]};
      return parseApply(expr, program.slice(match[0].length));
   }
   return {expr: expr, rest: program};
}

function parse(program) {
   let {expr, rest} = parseExpression(program);
   if (skipSpace(rest).length > 0) {
      throw new SyntaxError("Unexpected tokens after the end of the program");
   }
   return expr;
}

// ==========================================
// EVALUATOR
// ==========================================
function evaluate(parsedExpression, env) {
   if (parsedExpression.type === "value") return parsedExpression.value;
   
   if (parsedExpression.type === "word") {
      if (parsedExpression.name in VARIABLES) {
         return VARIABLES[parsedExpression.name];
      }
      if (parsedExpression.name in env) {
         return env[parsedExpression.name];
      } else {
         throw new ReferenceError(`Undefined variable: '${parsedExpression.name}'`);
      }
   }

   if (parsedExpression.type === "property") {
      let obj;
      if (typeof parsedExpression.object === "string") {
         obj = env[parsedExpression.object];
      } else {
         obj = evaluate(parsedExpression.object, env);
      }
      
      let propName = parsedExpression.property;
      if (obj === undefined) throw new TypeError(`Cannot read property '${propName}' of undefined`);
      
      let type = typeof obj;
      if ((type === "string" || type === "number") && TYPE_PROPERTIES[type] && propName in TYPE_PROPERTIES[type]) {
         return TYPE_PROPERTIES[type][propName](obj); 
      }
      
      if (typeof obj === "object") return obj[propName];
      
      throw new TypeError(`Property '${propName}' does not exist on type '${type}'`);
   }
   
   if (parsedExpression.type === 'apply') {
      
      if (parsedExpression.operator.type === "property") {
         let obj;
         if (typeof parsedExpression.operator.object === "string") {
            obj = env[parsedExpression.operator.object];
         } else {
            obj = evaluate(parsedExpression.operator.object, env);
         }
         
         let methodName = parsedExpression.operator.property;
         if (obj === undefined) throw new TypeError(`Cannot call method '${methodName}' of undefined`);
         
         let evaluatedArgs = parsedExpression.args.map(arg => evaluate(arg, env));
         
         let type = typeof obj;
         if ((type === "string" || type === "number") && typeof TYPE_METHODS !== "undefined" && TYPE_METHODS[type] && methodName in TYPE_METHODS[type]) {
            return TYPE_METHODS[type][methodName](obj, evaluatedArgs);
         }
         
         if (typeof obj === "object" && typeof obj[methodName] === "function") {
            return obj[methodName](evaluatedArgs);
         }
         
         throw new TypeError(`Method '${methodName}' does not exist on type '${type}'`);
      }

      if (parsedExpression.operator.type === "word" && parsedExpression.operator.name in SPECIAL_FORMS) {
         return SPECIAL_FORMS[parsedExpression.operator.name](parsedExpression.args, env, evaluate, parse);
      } 
      
      let funcObj;
      if (parsedExpression.operator.type === "word") {
         let currentOperator = parsedExpression.operator.name;
         if (typeof FUNCTIONS !== "undefined" && currentOperator in FUNCTIONS) {
            funcObj = FUNCTIONS[currentOperator];
         } else if (currentOperator in env) {
            funcObj = env[currentOperator];
         } else {
             throw new ReferenceError(`Undefined function: '${currentOperator}'`);
         }
      } else {
         funcObj = evaluate(parsedExpression.operator, env);
      }

      if (typeof funcObj !== "function") {
         throw new TypeError(`Attempted to invoke a non-function value`);
      }
      
      let evaluatedArgs = parsedExpression.args.map(arg => evaluate(arg, env));
      return funcObj(evaluatedArgs);
   }
   
   return parsedExpression;
}

export function interprete(expression){
   let parsed = parse(`do(${expression}\n)`);
   let globalEnv = Object.create(null);
   return evaluate(parsed, globalEnv)
}

// ==========================================
// CLI RUNNER
// ==========================================
function runCLI() {
   let args = process.argv.slice(2);
   
   if (args.length === 0) {
      console.log("Usage: cyc <filename.cyc>");
      process.exit(1);
   }
   
   let filename = args[0];
   
   try {
      if (!fs.existsSync(filename)) {
         throw new Error(`File not found: '${filename}'`);
      }
      
      let fileContent = fs.readFileSync(filename, 'utf8');
      interprete(fileContent);
   } catch (error) {
      console.error(`\nInterpreter Error:\n${error.name || 'Error'}: ${error.message}`);
      process.exit(1);
   }
}

if (process.argv.length > 2) {
   runCLI();
}
//npm link