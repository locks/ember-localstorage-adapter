import Ember from 'ember';
import DS from 'ember-data';

export default DS.JSONSerializer.extend({
  /**
   * Invokes the new serializer API.
   * This should be removed in 2.0
   */
  isNewSerializerAPI: true,

  serializeHasMany: function(snapshot, json, relationship) {
    var key = relationship.key;
    var payloadKey = this.keyForRelationship ? this.keyForRelationship(key, "hasMany") : key;
    var relationshipType = snapshot.type.determineRelationshipType(relationship, this.store);

    if (relationshipType === 'manyToNone' ||
        relationshipType === 'manyToMany' ||
          relationshipType === 'manyToOne') {
      json[payloadKey] = snapshot.hasMany(key, { ids: true });
    // TODO support for polymorphic manyToNone and manyToMany relationships
    }
  },

  /**
   * Extracts whatever was returned from the adapter.
   *
   * If the adapter returns relationships in an embedded way, such as follows:
   *
   * ```js
   * {
   *   "id": 1,
   *   "title": "Rails Rambo",
   *
   *   "_embedded": {
   *     "comment": [{
   *       "id": 1,
   *       "comment_title": "FIRST"
   *     }, {
   *       "id": 2,
   *       "comment_title": "Rails is unagi"
   *     }]
   *   }
   * }
   *
   * this method will create separated JSON for each resource and then combine
   * the data and the embed payload into the JSON.Api spec for included objects
   * returning a single object.
   *
   * @method extractSingle
   * @private
   * @param {DS.Store} store the returned store
   * @param {DS.Model} type the type/model
   * @param {Object} payload returned JSON
   */
  normalizeSingleResponse: function(store, type, payload) {
    var included = Ember.A([]);
    if (payload && payload._embedded) {
      var forEachFunc = (record) => {
        included.pushObject(this.normalize(relType,record).data);
      };

      for (var relation in payload._embedded) {
        var relType = type.typeForRelationship(relation,store);
          var embeddedPayload = payload._embedded[relation];

        if (embeddedPayload) {
          if (Ember.typeOf(embeddedPayload) === 'array') {
            embeddedPayload.forEach(forEachFunc);
          } else {
            included.pushObject(this.normalize(relType, embeddedPayload).data);
          }
        }
      }

      delete payload._embedded;
    }

    var normalPayload = this.normalize(type, payload);
    if(included.length > 0){
      normalPayload.included = included;
    }
    return normalPayload;
  },

  /**
   * This is exactly the same as extractSingle, but used in an array.
   *
   * @method extractSingle
   * @private
   * @param {DS.Store} store the returned store
   * @param {DS.Model} type the type/model
   * @param {Array} payload returned JSONs
   */
  normalizeArrayResponse: function(store, type, payload) {
    var response = { data: Ember.A([]), included: Ember.A([]) };
    payload.forEach((json) => {
      var normalized = this.normalizeSingleResponse(store, type, json);
      response.data.pushObject(normalized.data);

      if(normalized.included){
        normalized.included.forEach(function(included){
          if(!response.included.includes(included.id)){
            response.included.addObject(included);
          }
        });
      }
    });

    return response;
  }
});
