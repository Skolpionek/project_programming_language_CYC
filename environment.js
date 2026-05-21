//----------------------
//ERRORY
//----------------------

class SyntaxError extends Error{}
class TypeMismatchError extends Error{}
class DivisionByZero extends Error{}

//----------------------
//FUNKCJE
//----------------------

export const FUNCTIONS = Object.create(null);


FUNCTIONS.print = (args) => {

   const formatOutput = (arg) => {
      if (arg && arg.type === "list") {
         let inner = arg.value.map(v => formatOutput(v)).join(" ");
         return `(${inner})`;
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
//STRUKTURY DANYCH
//----------------------


FUNCTIONS.list = (args) => {
   let obj = Object.create(null);
   obj.type = "list";
   obj.value = args; 
   
   obj.add = (...args) => {
      obj.value.push(...args);
      return obj.value;  
   };
   
   obj.del = (...args) => {
      let amount = args[0] || 1;
      for(let i=0;i<amount;i++)
         obj.value.pop(); 
      return obj.value;
   };
   obj.get = (...args) => {
      let index = args[0];
      if (index >= obj.len) throw new SyntaxError("Index wykracza poza granice listy");
      return obj.value[index];
   }
   obj.set = (...args) => {
      let value = args[0];
      let index = args[1];
      if (index >= obj.len) throw new SyntaxError("Index wykracza poza granice listy");
      obj.value[index] = value;
      return obj.value[index];
   }

   Object.defineProperty(obj, 'len', {
      get: function() {
         return this.value.length;
      }
   });
   
   return obj;
}

//operatory artytmetyczne
FUNCTIONS["+"] = (args) => args.slice(1).reduce((acc, curr) => {
   // 1.czy ten sam typ danych
   if (typeof acc !== typeof curr) {
      console.log(acc)
      throw new TypeMismatchError(`Operacja na złych typach: próba dodania ${typeof curr} do ${typeof acc}`);
   }
   
   // dozwolone typy (tylko liczba lub string)
   if (typeof acc !== "number" && typeof acc !== "string") {
      throw new TypeMismatchError(`Błędny typ: operator dodawania nie obsługuje typu ${typeof acc}`);
   }
   
   return acc + curr;
}, args[0]);

FUNCTIONS["-"] = (args) => args.reduce((acc, curr) => {
   if(typeof acc !== "number" && typeof curr !== "number") throw new TypeMismatchError("Operacja na złych typach");
   return acc - curr;
});
FUNCTIONS["*"] = (args) => args.reduce((acc, curr) => {
   if(typeof acc !== "number" && typeof curr !== "number") throw new TypeMismatchError("Operacja na złych typach");
   return acc * curr
}
, 1);
FUNCTIONS["^"] = (args) => args.reduce((acc, curr) => {
   if(typeof acc !== "number" && typeof curr !== "number") throw new TypeMismatchError("Operacja na złych typach");
   return Math.pow(acc, curr)
});
FUNCTIONS["/"] = (args) => {
   return args.reduce((acc, curr) => {
      if(typeof acc !== "number" && typeof curr !== "number") throw new TypeMismatchError("Operacja na złych typach");
      if (curr === 0) throw new DivisionByZero("Nie można dzielić przez zero!");
      return acc / curr;
   });
};

//Operatory porówniania
let comparisonOperators = ["==","!=","<","<=",">",">="];
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

//Operatory logiczne
FUNCTIONS.and = (args) => args.every(arg => Boolean(arg));
FUNCTIONS.or = (args) => args.some(arg => Boolean(arg));
FUNCTIONS.nand = (args) => !(FUNCTIONS.and(args));
FUNCTIONS.nor = (args) => !(FUNCTIONS.or(args));
FUNCTIONS.not = (args) => {
   if(args.length !== 1) throw new SyntaxError("not przyjmuje tylko jeden argument: not(wyrazenie)");
   return !args[0];
};

//----------------------
//INSTRUKCJE SPECJALNE
//----------------------

export const SPECIAL_FORMS = Object.create(null);

SPECIAL_FORMS.do = (args, env, evaluate) => {
   let value = false;
   for (let arg of args) {
      value = evaluate(arg, env);
   }
   return value;
}
SPECIAL_FORMS.define = (args, env, evaluate) => {
   if (args.length !== 2 || args[0].type !== "word") {
      throw new SyntaxError("Niepoprawne przypisanie wartosci. Poprawne: =(nazwa, wartość)");
   }
   let value = evaluate(args[1], env);
   let type = args[0].valueType;
   if (!type) {
      if(typeof value === "object"){
         type = value.type;
      } else {
         type = typeof value
      }
   } 
   if (typeof value !== "object" && type !== typeof value){
      throw new SyntaxError(`Niezgodność typu dla zmiennej '${args[0].name}' typu '${type}' z wartością: ${value} typu '${typeof value}'`)
   }
   
   env[args[0].name] = value;
   return value;
};
SPECIAL_FORMS.set = (args, env, evaluate) => {
   if (args.length !== 2 || args[0].type !== "word") {
      throw new SyntaxError("Niepoprawne przypisanie wartosci. Poprawne: =(nazwa, wartość)");
   }
   if (args[0].valueType) {
      throw new SyntaxError(`Nie możesz podawać typu przy aktualizacji zmiennej! Usuń typowanie przy zmiennej '${args[0].name}'.`);
   }
   let varName = args[0].name;
   let targetEnv = env;
   while (targetEnv && !Object.prototype.hasOwnProperty.call(targetEnv, varName)) {
      targetEnv = Object.getPrototypeOf(targetEnv);
   }

   if (!targetEnv) throw new ReferenceError(`Zmienna '${varName}' nie jest zdefiniowana.`);
   let value = evaluate(args[1], env);
   let oldValue = targetEnv[varName];

   if (typeof value !== "object" && typeof oldValue !== typeof value) {
      throw new SyntaxError(`Niezgodność typu dla zmiennej '${varName}' typu '${typeof oldValue}' z wartością: ${value} typu '${typeof value}'`);
   } else if (typeof value === "object" && oldValue.type !== value.type) {
      throw new SyntaxError(`Niezgodność typu dla obiektu '${varName}'`);
   }

   targetEnv[varName] = value;
   return value;
};
SPECIAL_FORMS["="] = (args, env, evaluate) => {
   if (args[0].name in env) SPECIAL_FORMS.set(args,env,evaluate);
   else SPECIAL_FORMS.define(args,env,evaluate);
}
SPECIAL_FORMS["++"] = (args, env, evaluate,sex=1) => {
   if(!args.length)return 1*sex;
   args.forEach(arg => {
      if(typeof env[arg.name] !== "number"){
         throw new TypeMismatchError(`Zmienna ${arg.name} nie jest typu 'number', nie można jej inkrementować`);
      }
      SPECIAL_FORMS.define([{...arg, valueType: 'number'}, Number(evaluate(arg,env)+sex)],env,evaluate)
   });
   let values = args.map(arg => env[arg.name])
   if(values.length === 1)
      return values[0];
   return values;
};
SPECIAL_FORMS["--"] = (args, env, evaluate) => SPECIAL_FORMS["++"](args, env, evaluate,-1);

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
      }
   }
   else {
      throw new SyntaxError("Niepoprawne użycie if. Poprawne: if(warunek, prawda, fałsz)");
   }  
};

SPECIAL_FORMS.while = (args, env, evaluate) => {
   if (args.length !== 2) {
      throw new SyntaxError("Niepoprawne użycie while. Poprawne: while(warunek, instrukcja)");
   }
   while (evaluate(args[0], env) !== false) {
      evaluate(args[1], env);
      
   }
   
   return false;
}
SPECIAL_FORMS.for = (args, env, evaluate) => {
   if (args.length !== 4) {
      throw new SyntaxError("Niepoprawne użycie for. Poprawne: for(inicjalizacja; warunek; krok; ciało)");
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
      throw new SyntaxError("Funkcja poprzebuje ciała: func(...args,body)");
   }
   let body = args[args.length-1];
   let params = args.slice(0, args.length-1).map(expr => {
      if (expr.type != "word") {
         throw new SyntaxError("Nazwy parametrów muszą być zmiennymi");
      }
      return expr.name;
   });
   return function(args) {
      if(args.length != params.length) {
         throw new TypeError("Zła liczba argumentów")
      }
      let localEnv = Object.create(env);
      for (let i=0;i<args.length;i++){
         localEnv[params[i]] = args[i];
      }
      return evaluate(body, localEnv);
   }
}

//----------------------
// Zmienne Wbudowane
//----------------------

export const VARIABLES = Object.create(null);

VARIABLES.true = true;
VARIABLES.false = false;
VARIABLES.penis = "<===========3";