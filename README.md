# Ember-localstorage-adapter

[![Build
Status](https://travis-ci.org/locks/ember-localstorage-adapter.svg?branch=master)](https://travis-ci.org/locks/ember-localstorage-adapter)

Store your ember application data in localStorage.

Compatible with Ember Data 1.13 and above.

**NOTE**: New versions of the `localStorage` adapter are no longer compatible
with older versions of Ember Data. For older versions, checkout the `pre-beta`
branch.

Usage
-----

Include this addon in your app with `ember install ember-localstorage-adapter`
and then like all adapters and serializers:

```js
// app/serializers/application.js
import { LSSerializer } from 'ember-localstorage-adapter';

export default LSSerializer.extend();

// app/adapters/application.js
import LSAdapter from 'ember-localstorage-adapter';

export default LSAdapter.extend({
  namespace: 'yournamespace'
});
```

### Local Storage Namespace

All of your application data lives on a single `localStorage` key, it defaults to `DS.LSAdapter` but if you supply a `namespace` option it will store it there:

```js
import LSAdapter from 'ember-localstorage-adapter/adapters/ls-adapter';

export default LSAdapter.extend({
  namespace: 'my app'
});
```

### Models

Whenever the adapter returns a record, it'll also return all
relationships, so __do not__ use `{async: true}` in your model definitions.

#### Namespace

If your model definition has a `url` property, the adapter will store the data on that namespace. URL is a weird term in this context, but it makes swapping out adapters simpler by not requiring additional properties on your models.

```js
const List = DS.Model.extend({
  // ...
});
List.reopen({
  url: '/some/url'
});
export default List;
```

### Quota Exceeded Handler

Browser's `localStorage` has limited space, if you try to commit application data and the browser is out of space, then the adapter will trigger the `QUOTA_EXCEEDED_ERR` event.

```js
import DS from 'ember-data';
DS.Store.adapter.on('QUOTA_EXCEEDED_ERR', function(records){
  // do stuff
});

DS.Store.commit();
```

### Local Storage Unavailable

When `localStorage` is not available (typically because the user has explicitly disabled it), the adapter will keep records in memory. When the adapter first discovers that this is the case, it will trigger a `persistenceUnavailable` event, which the application may use to take any necessary actions.

```js
adapter.on('persistenceUnavailable', function() {
  // Maybe notify the user that their data won't live past the end of the current session
});
```

License & Copyright
-------------------

Copyright (c) 2012 Ryan Florence
MIT Style license. http://opensource.org/licenses/MIT

## Running

* `ember server`
* Visit your app at http://localhost:4200.

## Running Tests

* `npm test` (Runs `ember try:each` to test your addon against multiple Ember versions)
* `ember test`
* `ember test --server`

## Building

* `ember build`

For more information on using ember-cli, visit [http://www.ember-cli.com/](http://www.ember-cli.com/).
