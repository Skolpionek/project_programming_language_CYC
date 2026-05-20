
# Dokumentacja Języka `cyc`

Witaj w `cyc`! Jest to funkcyjny, ewaluowany dynamicznie język programowania oparty na składni przypominającej Lisp (drzewa AST), ale posiadający statyczne typowanie przy deklaracji zmiennych oraz wsparcie dla notacji kropkowej (obiektowej).

W `cyc` wszystko jest wyrażeniem (nawet pętle i bloki kodu zwracają wartości), a instrukcje opierają się na wywołaniach funkcji w formacie: `operator(argument1, argument2)`. Argumenty rozdziela się zamiennie przez `,` oraz `;`.

## 1. Typy danych

Podczas deklarowania nowych zmiennych należy określić ich typ za pomocą dwukropka `:`.
Dostępne typy to:

* `num` - liczby (np. `5`, `-10.5`)
* `str` - ciągi znaków (np. `"Witaj świecie"`)
* `bool` - wartości logiczne (`true`, `false`)
* `list` - struktury listowe
* `func` - funkcje
* `any` - typ dynamiczny (pozwala na przypisanie czegokolwiek)

## 2. Zmienne i przypisania

Język używa uniwersalnego operatora `=` do deklaracji i aktualizacji zmiennych. Inteligentny dyspozytor sam decyduje, czy stworzyć nową zmienną w lokalnym zasięgu (Scope), czy zaktualizować istniejącą.

```javascript
# Deklaracja nowej zmiennej 
=(wiek, 25);
=(wiek:num, 22);
=(imie, "Jan");
=(imie:str, "Kamil");
=(czyGotowy:bool, true);
=(czyGotowy, false);
Alternatywnie: 
define(wiek, 25);

# Aktualizacja istniejącej zmiennej (BEZ podawania typu)
=(wiek, 26);
Alternatywnie: 
set(wiek, 26);

# Skróty atrytmetyczne (inkrementacja / dekrementacja)
++(wiek);  # Zwiększa o 1
--(wiek);  # Zmniejsza o 1

```

## 3. Operatory matematyczne i logiczne

Operatory w `cyc` przyjmują dowolną liczbę argumentów. W przypadku porównań obsługują ewaluację łańcuchową (ang. *chaining*), a operatory logiczne mają wbudowane leniwe wartościowanie (tzw. *short-circuiting*).

### Matematyka

| Zapis | Opis | Przykład | Wynik |
| --- | --- | --- | --- |
| `+` | Dodawanie | `+(2, 2, 2)` | `6` |
| `-` | Odejmowanie | `-(10, 5)` | `5` |
| `*` | Mnożenie | `*(3, 3)` | `9` |
| `/` | Dzielenie | `/(100, 2)` | `50` |
| `^` | Potęgowanie | `^(2, 3)` | `8` |

### Logika i Porównania

| Zapis | Opis | Przykład | Wynik |
| --- | --- | --- | --- |
| `==`, `!=` | Równość / Nierówność | `==(5, 5)` | `true` |
| `<`, `<=`, `>`, `>=` | Operatory relacyjne (łańcuchowe) | `<(1, 5, 10)` | `true` |
| `and`, `or` | Koniunkcja i Alternatywa | `and(true, true)` | `true` |
| `nand`, `nor` | Zanegowane AND / OR | `nand(true, true)` | `false` |
| `not` | Negacja (tylko 1 argument) | `not(false)` | `true` |

## 4. Przepływ sterowania (Control Flow)

### Blok `do`

Wykonuje sekwencję instrukcji po kolei i zwraca wynik ostatniej z nich. Służy do grupowania kodu.

```javascript
do(
   print("Krok 1"),
   print("Krok 2"),
   +(2, 2)
)

```

### Instrukcja warunkowa `if`

Przyjmuje 2 lub 3 argumenty: `if(warunek, prawda, [fałsz])`.

```javascript
if(<(wiek, 18),
   print("Jesteś niepełnoletni"),
   print("Jesteś pełnoletni")
)

```

### Pętla `while`

Wykonuje instrukcję tak długo, jak warunek jest prawdziwy.

```javascript
=(x:num, 0);
while(<(x, 5),
   do(
      print(x),
      ++(x)
   )
)

```

### Pętla `for`

Tworzy ona własny, odizolowany Scope (zmienna licznika nie wycieka na zewnątrz). Składnia to `for(inicjalizacja; warunek; krok; ciało)`.

```javascript
for(=(i:num, 0); <(i, 10); ++(i);
   print("Obieg pętli: ", i)
)

```

## 5. Funkcje i domknięcia (Closures)

W `cyc` funkcje są obiektami pierwszej kategorii. Tworzymy je operatorem `func` (gdzie ostatni argument to ciało funkcji, a wcześniejsze to parametry) i przypisujemy do zmiennych. Posiadają one własny, izolowany Scope.

```javascript
# Definicja funkcji
=(dodaj, func(a, b, +(a, b)));

# Wywołanie funkcji
print(dodaj(5, 10)); # Wypisze: 15

# Rekurencja jest wspierana natywnie!
=(silnia, func(n,
   if(<=(n, 1),
      1,
      *(n, silnia(-(n, 1)))
   )
));

```

## 6. Listy i programowanie obiektowe

`cyc` obsługuje wielowymiarowe struktury listowe oraz dostęp do metod i właściwości za pomocą notacji kropkowej (`obiekt.właściwość`).

```javascript
# Tworzenie listy
=(mojaLista:list, list(1, 2, 3));

# Dodawanie elementów (metoda add)
mojaLista.add(4, 5);

# Odczytywanie długości (właściwość len)
print("Długość listy: ", mojaLista.len);

# Listy wielowymiarowe
=(macierz:list, list(list(1, 2), list(3, 4)));

```

## 7. Wejście / Wyjście

* **`print(arg1, arg2...)`** - Wypisuje argumenty do konsoli. Formatowanie list następuje automatycznie. *(Ciekawostka: wydrukowanie liczby 67 uruchamia systemowy Easter Egg).*.

---

## Instalacja

zklonuj repozytorium i wejdź do folderu repozytorium, następnie w terminalu wpisz `npm link`

## Uruchamianie Skryptów

Zakładając, że plik nazywa się `script.cyc`, w terminalu wpisz:
`cyc script.cyc`

*Koniec dokumentacji.*
