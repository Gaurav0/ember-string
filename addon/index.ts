/**
 @module @ember/string
 */
import Cache from './cache';
import { deprecate } from '@ember/debug';

// STATE within a module is frowned upon, this exists
// to support Ember.STRINGS but shield ember internals from this legacy global
// API.
let STRINGS: { [key: string]: string } = {};

export function setStrings(strings: { [key: string]: string }) {
  STRINGS = strings;
}

export function getStrings(): { [key: string]: string } {
  return STRINGS;
}

export function getString(name: string): string | undefined {
  return STRINGS[name];
}

const STRING_DASHERIZE_REGEXP = /[ _]/g;

const STRING_DASHERIZE_CACHE = new Cache<string, string>(1000, key =>
  decamelize(key).replace(STRING_DASHERIZE_REGEXP, '-')
);

const STRING_CAMELIZE_REGEXP_1 = /(\-|\_|\.|\s)+(.)?/g;
const STRING_CAMELIZE_REGEXP_2 = /(^|\/)([A-Z])/g;

const CAMELIZE_CACHE = new Cache<string, string>(1000, key =>
  key
    .replace(STRING_CAMELIZE_REGEXP_1, (_match, _separator, chr) => (chr ? chr.toUpperCase() : ''))
    .replace(STRING_CAMELIZE_REGEXP_2, (match /*, separator, chr */) => match.toLowerCase())
);

const STRING_CLASSIFY_REGEXP_1 = /^(\-|_)+(.)?/;
const STRING_CLASSIFY_REGEXP_2 = /(.)(\-|\_|\.|\s)+(.)?/g;
const STRING_CLASSIFY_REGEXP_3 = /(^|\/|\.)([a-z])/g;

const CLASSIFY_CACHE = new Cache<string, string>(1000, str => {
  let replace1 = (_match: string, _separator: string, chr: string) =>
    chr ? `_${chr.toUpperCase()}` : '';
  let replace2 = (_match: string, initialChar: string, _separator: string, chr: string) =>
    initialChar + (chr ? chr.toUpperCase() : '');
  let parts = str.split('/');

  for (let i = 0; i < parts.length; i++) {
    parts[i] = parts[i]
      .replace(STRING_CLASSIFY_REGEXP_1, replace1)
      .replace(STRING_CLASSIFY_REGEXP_2, replace2);
  }

  return parts
    .join('/')
    .replace(STRING_CLASSIFY_REGEXP_3, (match /*, separator, chr */) => match.toUpperCase());
});

const STRING_UNDERSCORE_REGEXP_1 = /([a-z\d])([A-Z]+)/g;
const STRING_UNDERSCORE_REGEXP_2 = /\-|\s+/g;

const UNDERSCORE_CACHE = new Cache<string, string>(1000, str =>
  str
    .replace(STRING_UNDERSCORE_REGEXP_1, '$1_$2')
    .replace(STRING_UNDERSCORE_REGEXP_2, '_')
    .toLowerCase()
);

const STRING_CAPITALIZE_REGEXP = /(^|\/)([a-z\u00C0-\u024F])/g;

const CAPITALIZE_CACHE = new Cache<string, string>(1000, str =>
  str.replace(STRING_CAPITALIZE_REGEXP, (match /*, separator, chr */) => match.toUpperCase())
);

const STRING_DECAMELIZE_REGEXP = /([a-z\d])([A-Z])/g;

const DECAMELIZE_CACHE = new Cache<string, string>(1000, str =>
  str.replace(STRING_DECAMELIZE_REGEXP, '$1_$2').toLowerCase()
);

function _fmt(str: string, formats: any[]) {
  // first, replace any ORDERED replacements.
  let idx = 0; // the current index for non-numerical replacements
  return str.replace(/%@([0-9]+)?/g, (_s: string, argIndex: string) => {
    let i = argIndex ? parseInt(argIndex, 10) - 1 : idx++;
    let r = i < formats.length ? formats[i] : undefined;
    return typeof r === 'string' ? r : r === null ? '(null)' : r === undefined ? '' : String(r);
  });
}

/**
  Formats the passed string, but first looks up the string in the localized
  strings hash. This is a convenient way to localize text. See
  `fmt` for more information on formatting.

  Note that it is traditional but not required to prefix localized string
  keys with an underscore or other character so you can easily identify
  localized strings.

  ```javascript
  import { setStrings, loc } from '@ember/string';

  setStrings({
    '_Hello World': 'Bonjour le monde',
    '_Hello %@ %@': 'Bonjour %@ %@'
  });

  loc("_Hello World");  // 'Bonjour le monde';
  loc("_Hello %@ %@", ["John", "Smith"]);  // "Bonjour John Smith";
  ```

  @method loc
  @param {String} str The string to format
  @param {Array} formats Optional array of parameters to interpolate into string.
  @return {String} formatted string
  @public
*/
export function loc(str: string, formats: any[]): string {
  deprecate(
    'loc is deprecated, use an internationalization or localization addon instead.',
    false,
    {
      id: 'ember-string-loc',
      until: '2.0.0',
      // @ts-ignore requires https://github.com/DefinitelyTyped/DefinitelyTyped/pull/32538 to be merged
      url: 'http://emberjs.com/deprecations/v2.x#toc_ember-string-loc'
    }
  );
  if (!Array.isArray(formats) || arguments.length > 2) {
    formats = Array.prototype.slice.call(arguments, 1);
  }

  str = STRINGS[str] || str;
  return _fmt(str, formats);
}

/**
  Splits a string into separate units separated by spaces, eliminating any
  empty strings in the process. This is a convenience method for split that
  is mostly useful when applied to the `String.prototype`.

  ```javascript
  import { w } from '@ember/string';

  w("alpha beta gamma").forEach(function(key) {
    console.log(key);
  });

  // > alpha
  // > beta
  // > gamma
  ```

  @method w
  @param {String} str The string to split
  @return {Array} array containing the split strings
  @public
*/
export function w(str: string): string[] {
  return str.split(/\s+/);
}

/**
  Converts a camelized string into all lower case separated by underscores.

  ```javascript
  import { decamelize } from '@ember/string';

  decamelize('innerHTML');          // 'inner_html'
  decamelize('action_name');        // 'action_name'
  decamelize('css-class-name');     // 'css-class-name'
  decamelize('my favorite items');  // 'my favorite items'
  ```

  @method decamelize
  @param {String} str The string to decamelize.
  @return {String} the decamelized string.
  @public
*/
export function decamelize(str: string): string {
  return DECAMELIZE_CACHE.get(str);
}

/**
  Replaces underscores, spaces, or camelCase with dashes.

  ```javascript
  import { dasherize } from '@ember/string';

  dasherize('innerHTML');                // 'inner-html'
  dasherize('action_name');              // 'action-name'
  dasherize('css-class-name');           // 'css-class-name'
  dasherize('my favorite items');        // 'my-favorite-items'
  dasherize('privateDocs/ownerInvoice';  // 'private-docs/owner-invoice'
  ```

  @method dasherize
  @param {String} str The string to dasherize.
  @return {String} the dasherized string.
  @public
*/
export function dasherize(str: string): string {
  return STRING_DASHERIZE_CACHE.get(str);
}

/**
  Returns the lowerCamelCase form of a string.

  ```javascript
  import { camelize } from '@ember/string';

  camelize('innerHTML');                   // 'innerHTML'
  camelize('action_name');                 // 'actionName'
  camelize('css-class-name');              // 'cssClassName'
  camelize('my favorite items');           // 'myFavoriteItems'
  camelize('My Favorite Items');           // 'myFavoriteItems'
  camelize('private-docs/owner-invoice');  // 'privateDocs/ownerInvoice'
  ```

  @method camelize
  @param {String} str The string to camelize.
  @return {String} the camelized string.
  @public
*/
export function camelize(str: string): string {
  return CAMELIZE_CACHE.get(str);
}

/**
  Returns the UpperCamelCase form of a string.

  ```javascript
  import { classify } from '@ember/string';

  classify('innerHTML');                   // 'InnerHTML'
  classify('action_name');                 // 'ActionName'
  classify('css-class-name');              // 'CssClassName'
  classify('my favorite items');           // 'MyFavoriteItems'
  classify('private-docs/owner-invoice');  // 'PrivateDocs/OwnerInvoice'
  ```

  @method classify
  @param {String} str the string to classify
  @return {String} the classified string
  @public
*/
export function classify(str: string): string {
  return CLASSIFY_CACHE.get(str);
}

/**
  More general than decamelize. Returns the lower\_case\_and\_underscored
  form of a string.

  ```javascript
  import { underscore } from '@ember/string';

  underscore('innerHTML');                 // 'inner_html'
  underscore('action_name');               // 'action_name'
  underscore('css-class-name');            // 'css_class_name'
  underscore('my favorite items');         // 'my_favorite_items'
  underscore('privateDocs/ownerInvoice');  // 'private_docs/owner_invoice'
  ```

  @method underscore
  @param {String} str The string to underscore.
  @return {String} the underscored string.
  @public
*/
export function underscore(str: string): string {
  return UNDERSCORE_CACHE.get(str);
}

/**
  Returns the Capitalized form of a string

  ```javascript
  import { capitalize } from '@ember/string';

  capitalize('innerHTML')                 // 'InnerHTML'
  capitalize('action_name')               // 'Action_name'
  capitalize('css-class-name')            // 'Css-class-name'
  capitalize('my favorite items')         // 'My favorite items'
  capitalize('privateDocs/ownerInvoice'); // 'PrivateDocs/ownerInvoice'
  ```

  @method capitalize
  @param {String} str The string to capitalize.
  @return {String} The capitalized string.
  @public
*/
export function capitalize(str: string): string {
  return CAPITALIZE_CACHE.get(str);
}
