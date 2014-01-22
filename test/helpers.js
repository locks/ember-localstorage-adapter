Ember.ENV.TESTING = true;

var FIXTURES = {
  'App.List': {
    records: {
      'l1': { id: 'l1', name: 'one', b: true, items: ['i1', 'i2'] },
      'l2': { id: 'l2', name: 'two', b: false, items: [] },
      'l3': { id: 'l3', name: 'three', b: false, items: [] }
    }
  },

  'App.Item': {
    records: {
      'i1': { id: 'i1', name: 'one', list: 'l1' },
      'i2': { id: 'i2', name: 'two', list: 'l1' }
    }
  }
};

var logLS = function() {
  console.log(localStorage.getItem('DS.LSAdapter'));
}

var cl = function(msg) { console.log(msg); }
var ct = function(msg) { console.table(msg); }

var setupStore = function(options) {
  var env = {};
  options = options || {};

  var container = env.container = new Ember.Container();

  var adapter = env.adapter = (options.adapter || DS.Adapter);
  delete options.adapter;

  for (var prop in options) {
    container.register('model:' + prop, options[prop]);
  }

  container.register('store:main', DS.Store.extend({
    adapter: adapter
  }));

  container.register('serializer:_default', DS.LSSerializer);
  container.register('serializer:_rest', DS.RESTSerializer);
  container.register('adapter:_rest', DS.RESTAdapter);

  container.injection('serializer', 'store', 'store:main');

  env.serializer = container.lookup('serializer:_default');
  env.restSerializer = container.lookup('serializer:_rest');
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

