import Ember from 'ember';
import DS from 'ember-data';
import Owner from 'dummy/tests/helpers/owner';
import LSSerializer from 'ember-localstorage-adapter/serializers/ls-serializer';

export default function setupStore(options) {
  let container, registry, owner;
  let env = {};
  options = options || {};

  if (Ember.Registry) {
    registry = env.registry = new Ember.Registry();
    owner = Owner.create({
      __registry__: registry
    });
    container = env.container = registry.container({owner});
    owner.__container__ = container;
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

  let adapter = env.adapter = (options.adapter || '-default');
  delete options.adapter;

  if (typeof adapter !== 'string') {
    env.registry.register('adapter:-default', adapter);
    adapter = '-default';
  }

  for (var prop in options) {
    registry.register(`model:${Ember.String.dasherize(prop)}`, options[prop]);
  }

  registry.register('service:store', DS.Store.extend({adapter}));

  registry.optionsForType('serializer', { singleton: false });
  registry.optionsForType('adapter', { singleton: false });

  registry.register('serializer:-default', LSSerializer);

  env.store = container.lookup('service:store');
  env.serializer = container.lookup('serializer:-default');
  env.adapter = container.lookup('adapter:-default');

  return env;
}

const transforms = {
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
