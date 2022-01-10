let _ = require("lodash");
let async = require("async");

module.exports = function mongoAutoIndexHook(sails) {
    function getIndexesFromModels() {
        let indexes = [];

        _.forIn(sails.models, (model, modelKey) => {
            if (modelKey == "archive") return;

            adapter = model._adapter.identity;

            // prettier-ignore
            if (adapter !== "sails-mongo") {
                sails.log.verbose(`sails-hook-mongo-auto-index: skipping model ${modelKey}, not a sails-mongo model`);
                return;
            }

            _.forIn(model.attributes, (attribute, attributeKey) => {
                if (attributeKey == "id") return;
                org = attribute.autoMigrations;
                if (
                    typeof org !== "undefined" && org !== null
                        ? org.unique
                        : void 0
                ) {
                    indexes.push({
                        model: model,
                        attributeKey: attributeKey,
                        unique: true,
                    });
                }

                if (attribute.index === true) {
                    indexes.push({
                        model: model,
                        attributeKey: attributeKey,
                        unique: false,
                    });
                }
            });
        });

        return indexes;
    }

    function createIndexes(indexes, cb) {
        let cbCalled = false; // control variable to call the hook callback only once
        async.each(indexes, createIndex, (err) => {
            if (err) {
                if (!cbCalled) {
                    cbCalled = true;
                    cb(err);
                }
                return;
            }

            if (!cbCalled) {
                cbCalled = true;
                cb();
            }
        });
    }

    async function createIndex(index, cb) {
        let { model } = index;
        let { attributeKey } = index;
        let { unique } = index;

        const db = await model.getDatastore().manager;
        const collection = await db.collection(model.tableName);

        collection.ensureIndex(
            attributeKey,
            { unique: unique },
            (err, result) => {
                if (err) return cb(err);

                cb();
            }
        );
    }

    return {
        initialize: function (cb) {
            sails.on("hook:orm:loaded", () => {
                let indexes = getIndexesFromModels();
                createIndexes(indexes, cb);
            });
        },
    };
};
