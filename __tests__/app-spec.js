const admin = require('firebase-admin');
const moment = require('moment');
const serviceAccount = require('../service-key.json');
const uuid = require('uuid/v1');

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

    describe("app simulation", () => {
        let originalTimeout; // increase timeout for batch job test and replace
        let randomDeleteKeys = [];
        const startDate = `2017-01-01`;

        beforeAll((done) => {
            const TransTypes = {
                INT_CHARGE: 'Interest Charge',
                INT_CREDIT: 'Interest Credit',
                DEPOSIT: 'Deposit',
                ADVANCE: 'Advance'
            };
            const MAX_RECS = 150000;
            const CHUNK_SIZE = 1000;
            const SAMPLE_SIZE = 50; // randomly pick a key for deletion and query

            // update timeout interval for test suite
            originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
            jasmine.DEFAULT_TIMEOUT_INTERVAL = 480000;

            const _handleChunks = async (chunks) => {
                console.log(`Handling ${chunks.length} chunks ...`)
                await Promise.all(chunks.map(async chunk => {
                    await db.ref().update(chunk);
                    console.log(`*********** Processed chunk *************`);
                }))
                console.log(`Finished chunks`);
            }
    
            const newRec = (id, chunk = 0) => {
                return {
                    account_id : '1932-324sdf-324sdf-124124',
                    account_interest_bal : 100.0,
                    account_name : 'Test account',
                    account_principal_bal : 1000.0,
                    amount: 3.24,
                    description : 'Daily interest computation',
                    id : id,
                    object : 'transaction',
                    org_available_funds : 10000.0,
                    org_id : 'org-1348293402-23xvasdf-werd',
                    owner : 'System',
                    status : 'approved',
                    type : TransTypes.INT_CHARGE,
                    rate: 0.0475,
                    published: moment.utc(startDate).add(chunk, 'day').endOf('day').valueOf(),
                    updated : moment.utc(startDate).add(chunk, 'day').endOf('day').valueOf(),
                    user : "System"
                }
            }
    
            const getTestRecordChunks = () => {
                const transChunks = [];
                let currentChunk = {};
                
                for (let i = 0; i < MAX_RECS; i++) {
                    const id = uuid();

                    let chunkCount = 0;
                    currentChunk[`transactions/${id}`] = newRec(id, chunkCount);

                    // pick 'pseudorandom' keys for deletion and test later
                    if (i % SAMPLE_SIZE == 0) {
                        randomDeleteKeys.push(id);
                    }
    
                    if (i % CHUNK_SIZE == 0 || i == MAX_RECS) {
                        transChunks.push(currentChunk);
                        chunkCount ++; // used for incrementing date to allow a range query of subset of dates
                        currentChunk = {};
                    }
                }
    
                return transChunks;
            }

            Promise.all([ _handleChunks( getTestRecordChunks() ) ])
                .then(values => {
                    console.log(`Successfully updated database with chunks`);
                    done();
                })
                .catch(error => {
                    console.error(`Error updating database`, error);
                    done.fail(error);
                });
        });

        afterAll((done) => {
            // restore timeout interval for test suite
            jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;

            // empty random delete keys array
            randomDeleteKeys = [];

            db.ref(`transactions`).remove()
                .then((_) => {
                    console.log(`Removed test transactions`);
                    done();
                })
                .catch((error) => {
                    console.log(`Error removing test transactions`, error);
                    done.fail(error);
                });
        });

        it("queries index for subset of data", (done) => {
            const start = moment.utc(startDate).valueOf();
            const end = moment.utc(startDate).add(30, 'days').valueOf();
            const limitQuery = db.ref('transactions').orderByChild("published").startAt(start).endAt(end);

            limitQuery
                .once('value')
                .then((snapshot) => {
                    const records = snapshot.val();
                    const resultLength = Object.keys(records).length;
    
                    console.log(`Found ${resultLength} records from query!`);
                    done();
                })
                .catch((error) => {
                    done.fail(error);
                });
        });

        it("removes sampled keys using bulk update feature", (done) => {
            // build dictionary of keys to bulk delete [set to null]
            const updateData = {};
            randomDeleteKeys.map((key) => updateData[`transactions/${key}`] = null);

            db.ref().update(updateData)
                .then(() => {
                    console.log(`Set ${randomDeleteKeys.length} keys to null`);
                    done();
                })
                .catch((error) => {
                    console.error(`Error bulk removing sampled records`, error);
                    done.fail(error);
                });
        });

        it("queries subset and sampled keys should NOT exist", (done) => {
            const start = moment.utc(startDate).valueOf();
            const end = moment.utc(startDate).add(30, 'days').valueOf();
            const limitQuery = db.ref('transactions').orderByChild("published").startAt(start).endAt(end);

            limitQuery
                .once('value')
                .then((snapshot) => {
                    const records = snapshot.val();
                    const resultLength = Object.keys(records).length;
                    let deletedRecordFound = false;
    
                    console.log(`Found ${resultLength} records from query!`);
                    
                    // loop through deleted keys and make sure none exist in results
                    randomDeleteKeys.map((key) => {
                        const match = records[key];
                        if (match && match.id == key) {
                            console.log(`Record: ${key} found in results but should not exist`);
                            deletedRecordFound = true;
                        }
                    });

                    if (!deletedRecordFound) {
                        done();
                    } else {
                        done.fail(new Error(`Deleted records appeared in search results`));
                    }
                })
                .catch((error) => {
                    done.fail(error);
                });
        });

    }); // simulation
});
