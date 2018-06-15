var admin = require('firebase-admin');
var serviceAccount = require('../service-key.json');

const fbAdmin = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://test-cache-issue.firebaseio.com"
});

const auth = fbAdmin.auth();
const db = fbAdmin.database();

describe("firebase", () => {
    it("saves some bulk data", (done) => {
        const updateData = {
            "test/1": {id: 1, name: "test"},
            "test/2": {id: 2, name: "test"},
            "test/3": {id: 3, name: "test"},
            "test/4": {id: 4, name: "test"},
            "test/5": {id: 5, name: "test"},
            "test/6": {id: 6, name: "test"},
            "test/7": {id: 7, name: "test"},
            "test/8": {id: 8, name: "test"},
            "test/9": {id: 9, name: "test"},
            "test/10": {id: 10, name: "test"},
        }

        db.ref().update(updateData)
            .then(() => {
                // now check if data updated
                db.ref('test')
                    .once('value')
                    .then((snapshot) => {
                        const records = snapshot.val();
                        const testLength = Object.keys(updateData).length;
                        const resultLength = Object.keys(records).length;

                        expect(resultLength).toEqual(testLength);
                        done();
                    })
                    .catch((error) => {
                        done.fail(error);
                    });
            });
    }); // saves bulk data

    it("queries subset list of results", (done) => {
        const limitQuery = db.ref('test').orderByChild("id").startAt(1).endAt(5);

        limitQuery
            .once('value')
            .then((snapshot) => {
                const records = snapshot.val();
                const resultLength = Object.keys(records).length;

                expect(resultLength).toEqual(5);
                done();
            })
            .catch((error) => {
                done.fail(error);
            });
    }); // queries subset

    it("bulk updates several records", (done) => {
        const updateData = {
            "test/1": {id: 1, name: "test"},
            "test/2": null,
            "test/3": null,
            "test/4": null,
            "test/5": {id: 5, name: "test"},
            "test/6": {id: 6, name: "test"},
            "test/7": {id: 7, name: "test"},
            "test/8": {id: 8, name: "test"},
            "test/9": {id: 9, name: "test"},
            "test/10": {id: 10, name: "test"},
        }

        db.ref().update(updateData)
            .then(() => {
                // now check if data updated
                db.ref('test')
                    .once('value')
                    .then((snapshot) => {
                        const records = snapshot.val();
                        const testLength = Object.keys(updateData).length - 3; // nullified 3 recs
                        const resultLength = Object.keys(records).length;

                        expect(resultLength).toEqual(testLength);
                        done();
                    })
                    .catch((error) => {
                        done.fail(error);
                    });
            });
    }); // delete 3 records

    it("queries subset list of results with 3 less records", (done) => {
        const limitQuery = db.ref('test').orderByChild("id").startAt(1).endAt(5);

        limitQuery
            .once('value')
            .then((snapshot) => {
                const records = snapshot.val();
                const resultLength = Object.keys(records).length;

                expect(resultLength).toEqual(2); // removed 3 records
                done();
            })
            .catch((error) => {
                done.fail(error);
            });
    });
});
