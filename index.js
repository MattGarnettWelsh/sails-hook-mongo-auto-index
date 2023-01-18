let async = require("async");

module.exports = function mongoAutoIndexHook(sails) {
    function getIndexesFromModels() {
        let indexes = [];

        // for in loop over sails.models
        for (const key in sails.models) {
            if (Object.hasOwnProperty.call(sails.models, key)) {
                const model = sails.models[key];

                if (key == "archive") return;

                adapter = model._adapter.identity;

                if (adapter !== "sails-mongo") {
                    sails.log.verbose(
                        `sails-hook-mongo-auto-index: skipping model ${key}, not a sails-mongo model`
                    );
                    return;
                }

                for (const attributeKey in model.attributes) {
                    if (
                        Object.hasOwnProperty.call(
                            model.attributes,
                            attributeKey
                        )
                    ) {
                        const attribute = model.attributes[attributeKey];

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
                    }
                }
            }
        }

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
