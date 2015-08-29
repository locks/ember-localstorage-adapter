Ember.ENV.TESTING = true;

var FIXTURES = {
  'list': {
    records: {
      'l1': { id: 'l1', name: 'one', b: true, items: ['i1', 'i2'] },
      'l2': { id: 'l2', name: 'two', b: false, items: [] },
      'l3': { id: 'l3', name: 'three', b: false, items: [] }
    }
  },

  'item': {
    records: {
      'i1': { id: 'i1', name: 'one', list: 'l1' },
      'i2': { id: 'i2', name: 'two', list: 'l1' }
    }
  },

  'order': {
    records: {
      'o1': { id: 'o1', name: 'one', b: true, hours: ['h1', 'h2'] },
      'o2': { id: 'o2', name: 'two', b: false, hours: [] },
      'o3': { id: 'o3', name: 'three', b: true, hours: ['h3', 'h4'] },
      'o4': { id: 'o4', name: 'four', b: true, hours: [] }
    }
  },

  'hour': {
    records: {
      'h1': { id: 'h1', name: 'one', amount: 4, order: 'o1' },
      'h2': { id: 'h2', name: 'two', amount: 3, order: 'o1' },
      'h3': { id: 'h3', name: 'three', amount: 2, order: 'o3' },
      'h4': { id: 'h4', name: 'four', amount: 1, order: 'o3' }
    }
  }
};

var logLS = function() {
  console.log(localStorage.getItem('DS.LSAdapter'));
};

var cl = function(msg) { console.log(msg); };
var ct = function(msg) { console.table(msg); };

var setupStore = function(options) {
  var container, registry;
  var env = {};
  options = options || {};

  if (Ember.Registry) {
    registry = env.registry = new Ember.Registry();
    container = env.container = registry.container();
  } else {
    container = env.container = new Ember.Container();
    registry = env.registry = container;
  }

  env.replaceContainerNormalize = function replaceContainerNormalize(fn) {
    if (env.registry) {
      env.registry.normalize = fn;
    } else {
      env.container.normalize = fn;
    }
  };

  var adapter = env.adapter = (options.adapter || DS.Adapter);
  delete options.adapter;

  if (typeof adapter !== 'string') {
    env.registry.register('adapter:-default', adapter);
    adapter = '-default';
  }

  for (var prop in options) {
    registry.register('model:' + Ember.String.dasherize(prop), options[prop]);
  }

  registry.register('store:main', DS.Store.extend({
    adapter: adapter
  }));

  registry.register('serializer:-default', DS.LSSerializer);
  registry.register('serializer:-rest', DS.RESTSerializer);
  registry.register('adapter:-rest', DS.RESTAdapter);

  registry.injection('serializer', 'store', 'store:main');

  env.serializer = container.lookup('serializer:-default');
  env.restSerializer = container.lookup('serializer:-rest');
  env.store = container.lookup('store:main');
  env.adapter = env.store.get('defaultAdapter');

  return env;
};

var transforms = {
  'boolean': DS.BooleanTransform.create(),
  'date': DS.DateTransform.create(),
  'number': DS.NumberTransform.create(),
  'string': DS.StringTransform.create()
};

// Prevent all tests involving serialization to require a container
DS.JSONSerializer.reopen({
  transformFor: function(attributeType) {
    return this._super(attributeType, true) || transforms[attributeType];
  }
});
