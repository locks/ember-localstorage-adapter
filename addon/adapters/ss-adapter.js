import LSAdapter from 'ember-localstorage-adapter/adapters/ls-adapter';

const DEFAULT_NAMESPACE = 'DS.SSAdapter';

export default LSAdapter.extend({
  getNativeStorage() {
    return sessionStorage;
  },
  adapterNamespace() {
    return this.get('namespace') || DEFAULT_NAMESPACE;
  }
});
