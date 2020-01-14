## Module Report
### Unknown Global

**Global**: `Ember._RegistryProxyMixin`

**Location**: `tests/helpers/owner.js` at line 5

```js
let Owner;

if (Ember._RegistryProxyMixin && Ember._ContainerProxyMixin) {
  Owner = Ember.Object.extend(Ember._RegistryProxyMixin, Ember._ContainerProxyMixin);
} else {
```

### Unknown Global

**Global**: `Ember._ContainerProxyMixin`

**Location**: `tests/helpers/owner.js` at line 5

```js
let Owner;

if (Ember._RegistryProxyMixin && Ember._ContainerProxyMixin) {
  Owner = Ember.Object.extend(Ember._RegistryProxyMixin, Ember._ContainerProxyMixin);
} else {
```

### Unknown Global

**Global**: `Ember._RegistryProxyMixin`

**Location**: `tests/helpers/owner.js` at line 6

```js

if (Ember._RegistryProxyMixin && Ember._ContainerProxyMixin) {
  Owner = Ember.Object.extend(Ember._RegistryProxyMixin, Ember._ContainerProxyMixin);
} else {
  Owner = Ember.Object.extend();
```

### Unknown Global

**Global**: `Ember._ContainerProxyMixin`

**Location**: `tests/helpers/owner.js` at line 6

```js

if (Ember._RegistryProxyMixin && Ember._ContainerProxyMixin) {
  Owner = Ember.Object.extend(Ember._RegistryProxyMixin, Ember._ContainerProxyMixin);
} else {
  Owner = Ember.Object.extend();
```

### Unknown Global

**Global**: `Ember.Registry`

**Location**: `tests/helpers/store.js` at line 11

```js
  options = options || {};

  if (Ember.Registry) {
    registry = env.registry = new Ember.Registry();
    owner = Owner.create({
```

### Unknown Global

**Global**: `Ember.Registry`

**Location**: `tests/helpers/store.js` at line 12

```js

  if (Ember.Registry) {
    registry = env.registry = new Ember.Registry();
    owner = Owner.create({
      __registry__: registry
```

### Unknown Global

**Global**: `Ember.Container`

**Location**: `tests/helpers/store.js` at line 19

```js
    owner.__container__ = container;
  } else {
    container = env.container = new Ember.Container();
    registry = env.registry = container;
  }
```
