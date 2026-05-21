#!/usr/bin/env node

import fs from 'fs';
import { FUNCTIONS, SPECIAL_FORMS, VARIABLES } from './environment.js';

class SyntaxError extends Error{}


function skipSpace(string) {
   let skippable = string.match(/^(\s|#.*)*/);
   return string.slice(skippable[0].length);
}

function parseExpression(program) {
   program = skipSpace(program);
   let match, expr;
   
   if (match = /^"([^"]*)"/.exec(program)) {
      expr = {type: "value", value: match[1].replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r').replace(/\\x1b/g, '\x1b')};
   } else if (match = /^\d+(\.\d+)?\b/.exec(program)) {
      expr = {type: "value", value: Number(match[0])};
      
   } else if (match = /^([^\s(),#":]+)(?::([a-zA-Z0-9_]+))?/.exec(program)) {
      
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
            case "list": expr.valueType = "list"; break;
            case "func": expr.valueType = "function"; break;
            case "any": expr.valueType = "anything"; break;
         }
      }
      
   } else {
      throw new SyntaxError("Niepoprawna składnia: " + program);
   }
   return parseApply(expr, program.slice(match[0].length));
}

function parseApply(expr, program) {
   program = skipSpace(program);
   if (program[0] != "(") {
      return {expr: expr, rest: program};
   }
   program = skipSpace(program.slice(1));
   expr = {type: "apply", operator: expr, args: []};
   while (program[0] != ")") {
      let arg = parseExpression(program);
      expr.args.push(arg.expr);
      program = skipSpace(arg.rest);
      if (program[0] == "," || program[0] == ";") {
         program = skipSpace(program.slice(1));
      } else if (program[0] != ")") {
         throw new SyntaxError("Oczekiwano ',' ';' lub ')'");
      }
   }
   return parseApply(expr, program.slice(1));
}

function parse(program) {
   let {expr, rest} = parseExpression(program);
   if (skipSpace(rest).length > 0) {
      throw new SyntaxError("Niepoprawna składnia po programie");
   }
   return expr;
}

function evaluate(parsedExpression, env) {
   if (parsedExpression.type === "value") return parsedExpression.value;
   
   if (parsedExpression.type === "word") {
      if (parsedExpression.name in VARIABLES) {
         return VARIABLES[parsedExpression.name];
      }
      if (parsedExpression.name in env) {
         return env[parsedExpression.name];
      } else {
         throw new ReferenceError(`Niezdefiniowana zmienna: ${parsedExpression.name}`);
      }
   }

   if (parsedExpression.type === "property") {
      let obj = env[parsedExpression.object];
      if (!obj) throw new ReferenceError(`Niezdefiniowany obiekt: ${parsedExpression.object}`);
      
      return obj[parsedExpression.property];
   }
   
   if (parsedExpression.type === 'apply') {
      if (parsedExpression.operator.type === "property") {
         let objName = parsedExpression.operator.object;
         let methodName = parsedExpression.operator.property;
         
         let obj = env[objName];
         if (!obj) throw new ReferenceError(`Niezdefiniowany obiekt: ${objName}`);
          if (typeof obj[methodName] !== "function") throw new TypeError(`${methodName} nie jest metodą!`);
          
          let evaluatedArgs = parsedExpression.args.map(arg => evaluate(arg, env));
          return obj[methodName](...evaluatedArgs);
      }

      let currentOperator = parsedExpression.operator.name;
      
      if (currentOperator in SPECIAL_FORMS) {
         return SPECIAL_FORMS[currentOperator](parsedExpression.args, env, evaluate);
      } 
      
      if (currentOperator in FUNCTIONS) {
         let evaluatedArgs = parsedExpression.args.map(arg => evaluate(arg, env));
         let result = FUNCTIONS[currentOperator](evaluatedArgs);
         return result;
      }
      if (currentOperator in env) {
         let funcObj = env[currentOperator];
         if (typeof funcObj !== "function") {
             throw new TypeError(`'${currentOperator}' nie jest funkcją.`);
         }
         let evaluatedArgs = parsedExpression.args.map(arg => evaluate(arg, env));
         return funcObj(evaluatedArgs);
      }
      throw new SyntaxError(`Nieznana funkcja lub operator: ${currentOperator}`);
   }
   
   return parsedExpression;
}

function interprete(expression){
   let parsed = parse(`do(${expression})`);
   let globalEnv = Object.create(null);
   return evaluate(parsed, globalEnv)
}

function runCLI() {
   let args = process.argv.slice(2);
   
   if (args.length === 0) {
      console.log("Użycie: cyc <nazwa_pliku.cyc>");
      process.exit(1);
   }
   
   let filename = args[0];
   
   try {
      let fileContent = fs.readFileSync(filename, 'utf8');
      interprete(fileContent);
   } catch (error) {
      console.error(`\nBłąd interpretera:\n${error.message}`);
      process.exit(1);
   }
}

runCLI();
//npm link




