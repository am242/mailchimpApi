var express = require("express");
var app = express();
var cron = require("node-cron");
var Mailchimp = require("mailchimp-api-v3");
const axios = require("axios");
var fs = require("fs");
var Logger = (exports.Logger = {});
var errorStream = fs.createWriteStream("logs/error.txt");
Logger.error = function (msg) {
    var message = new Date().toISOString() + " : " + msg + "\n";
    errorStream.write(message);
};
var mailchimp = new Mailchimp("*********");
var sql = require("mssql");
// config for your database
var config = {
    user: "****",
    password: "*****",
    server: "*****",
    database: "*****"
};

function daysBetween() {
    var year = 15768000;
    firstDay = new Date(new Date().getFullYear(), 0, 1);
    var today = new Date();
    var days = Math.round(Math.abs(+firstDay - +today) / 8.64e7);
    var calcDate = year + days * 24 * 60 - 10080;
    return calcDate.toString();
}

var calcDateString = daysBetween();

var getNewEngQuery =
    "select PHONEBOOK.EMAIL AS [email_address]  from PHONEBOOK, PHONEBOOKA WHERE PHONEBOOK.PHONE = PHONEBOOKA.PHONE AND PHONEBOOK.POSITION = 7 AND PHONEBOOKA.CURDATE > ";
var query2 = "AND PHONEBOOK.EMAIL <> '' ";
var res1 = getNewEngQuery + " " + calcDateString + " " + query2;
var queryPcn =
    "select PHONEBOOK.EMAIL AS [email_address]  from PHONEBOOK, PHONEBOOKA ,CUSTOMERS WHERE PHONEBOOK.PHONE = PHONEBOOKA.PHONE AND PHONEBOOK.POSITION = 7 AND PHONEBOOK.CUST = CUSTOMERS.CUST AND CUSTOMERS.CUST = 49";
/*
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const msg = {
  to: 'am2@outlook.co.il',
  from: 'm7115599@gmail.com',
  subject: 'Update maillist report',
  html: '<p>Mail report attached!</p>',
   attachments: [
    {
      content: './logs/error.txt',
      filename: 'error.txt',
      type: 'plain/text',
      disposition: 'attachment',
      contentId: 'mytext'
    },
  ],
};

 cron.schedule('* * * * *', function(){
sgMail.send(msg);
console.log("send report");
    });
	*/
cron.schedule("* * 17 * *", function () {
    axios
        .get("http://51.38.34.163:5000")
        .then(response => {
            console.log("insert ENG runing!");
        })
        .catch(error => {
            console.log(error);
        });
});

// connect to your database
sql.connect(
    config,
    function (err) {
        if (err) console.log(err);

        // create Request object
        var request = new sql.Request();

        cron.schedule("* * 17 * *", function () {
            axios
                .get("http://51.38.34.163:5000")
                .then(response => {
                    console.log("insert ENG runing!");
                })
                .catch(error => {
                    console.log(error);
                });
        });
        const updateCampigenId = (id, campigenName) => {
            const queryInsert = `UPDATE MCDI_PCNPARTS SET MCDI_CAMPIGENID = '${id}' WHERE PCN_NUM = '${campigenName}'`;
            //  const queryInsert1 = 'UPDATE MCDI_PCNPARTS SET MCDI_CAMPIGENID = ' + ' ' + "'" + id + "'" + ' ' + 'WHERE PCN_NUM =' + ' ' + "'" + campigenName + "'";
            request.query(
                queryInsert,

                function (err, recordset) {
                    if (err) console.log(err);

                    // send records as a response
                    console.log(queryInsert);
                    console.log(recordset);

                }
            );
        };
        const updateOpenEmail = (email, campigenId) => {
            const queryUpdateOpen = `UPDATE
            MCDI_PCNPHONE
        SET
            OPEN_EMAIL = 'Y'
        FROM
            MCDI_PCNPHONE AS Table_A
            INNER JOIN PHONEBOOK AS Table_B
                ON Table_A.PHONE = Table_B.PHONE
            INNER JOIN MCDI_PCNPARTS AS Table_C
                ON Table_A.ID = Table_C.ID
        WHERE
            Table_B.EMAIL = '${email}'
            AND Table_C.MCDI_CAMPIGENID = '${campigenId}'`;

            request.query(
                queryUpdateOpen,

                function (err, recordset) {
                    if (err) console.log(err);

                    // send records as a response
                    console.log(recordset);

                }
            );
        };
        const getEmailActivity = () => {
            const queryCampigenId = 'SELECT MCDI_CAMPIGENID "id" , CUEDATE "date" FROM MCDI_PCNPARTS WHERE MCDI_CAMPIGENID <> ' + "' '";
            //  const queryInsert1 = 'UPDATE MCDI_PCNPARTS SET MCDI_CAMPIGENID = ' + ' ' + "'" + id + "'" + ' ' + 'WHERE PCN_NUM =' + ' ' + "'" + campigenName + "'";
            request.query(
                queryCampigenId,

                function (err, recordset) {
                    if (err) console.log(err);

                    // send records as a response
                    console.log("ID IS: ", recordset['recordset'][0]['id'], "DATE IS", recordset['recordset'][0]['date']);
                    for (var k in recordset['recordset']) {
                        console.log(`/reports/${recordset['recordset'][k]['id']}/email-activity/`);
                        mailchimp
                            .get(`/reports/${recordset['recordset'][k]['id']}/email-activity/`)
                            .then(function (results) {
                                console.log(results['emails']);
                                const arrayObj = results['emails'];
                                arrayObj.forEach(email => updateOpenEmail(email.email_address, email.campaign_id));
                            })
                            .catch(function (err) {
                                console.log(err);
                                Logger.error(err);
                            });
                    }

                }
            );
        };
        const addMembers = (id, listName) => {
            const queryList =
                "select PHONEBOOK.EMAIL AS [email_address]  from PHONEBOOK, MCDI_PCNPARTS, MCDI_PCNPHONE WHERE MCDI_PCNPARTS.PCN_NUM =";
            const queryList2 =
                queryList +
                " " +
                "'" +
                listName +
                "'" +
                " " +
                "AND MCDI_PCNPARTS.ID = MCDI_PCNPHONE.ID AND PHONEBOOK.PHONE = MCDI_PCNPHONE.PHONE;";
            request.query(
                queryList2,

                function (err, recordset) {
                    if (err) console.log(err);

                    // send records as a response

                    for (var k in recordset) {
                        for (var item in recordset[k]) {
                            recordset[k][item].status = "subscribed";
                        }
                    }
                    var calls = [recordset];

                    for (var y in recordset) {
                        for (x in recordset[y]) {
                            mailchimp
                                .post(`/lists/${id}/members`, recordset[y][x])
                                .then(function (results) {
                                    //  console.log(results);
                                })
                                .catch(function (err) {
                                    // console.log(err);
                                    Logger.error(err);
                                });
                        }
                    }
                }
            );
        };
        const newCampigen = (id, campigenName) => {
            subject = "New PCN from Mini Circuits" + " " + campigenName;
            mailchimp
                .post("/campaigns", {
                    recipients: {
                        list_id: id
                    },
                    type: "regular",
                    settings: {
                        subject_line: subject,
                        reply_to: "office@mcdi-ltd.com",
                        from_name: "Mcdi - Mini Circuits",
                        template_id: 144613
                    }
                })
                .then(function (results) {
                    console.log('Campigen id is:', results['id']);
                    updateCampigenId(results['id'], campigenName);
                })
                .catch(function (err) {
                    console.log(err);
                });
        };
        app.get("/", function (req, res) {
            getEmailActivity();
            // query to the database and get the records
            request.query(res1, function (err, recordset) {
                if (err) console.log(err);

                // send records as a response

                for (var k in recordset) {
                    for (var item in recordset[k]) {
                        recordset[k][item].status = "subscribed";
                    }
                }
                var calls = [recordset];

                for (var y in recordset) {
                    for (x in recordset[y]) {
                        mailchimp
                            .post("/lists/43648762f3/members", recordset[y][x])
                            .then(function (results) {
                                console.log(results);
                            })
                            .catch(function (err) {
                                Logger.error(err);
                            });
                    }
                }

                res.send(calls);
            });
        });

        app.get("/list/:name", function (req, res) {
            const newList = {
                name: "",
                contact: {
                    company: "MCDI-LTD",
                    address1: "Hma'apilim 31",
                    address2: "",
                    city: "Rahmat Hasharon",
                    state: "",
                    zip: "",
                    country: "ISRAEL",
                    phone: "+972544446900"
                },
                permission_reminder: ".",
                campaign_defaults: {
                    from_name: "Daniel Yacoby - Mini Circuits",
                    from_email: "daniel@mcdi-ltd.com",
                    subject: "",
                    language: "en"
                },
                email_type_option: true
            };
            const listName = req.params.name;
            newList.name = listName;
            console.log(newList);

            mailchimp
                .post("/lists/", newList)
                .then(function (results) {
                    console.log(results["id"]);
                    addMembers(results["id"], listName);
                    newCampigen(results["id"], listName);
                })
                .catch(function (err) {
                    console.log(err);
                });
        });

        app.get("/list1/:name", function (req, res) {
            const listName = req.params.name;
            newCampigen('2b8278d46f', listName);
        });
        app.get("/listMembers", function (req, res) {
            mailchimp
                .get("/lists/2c8d612fb5/members")
                .then(function (results) {
                    res.send(results);
                })
                .catch(function (err) {
                    console.log(err);
                });
        });
    }
);

var server = app.listen(5000, function () {
    console.log("Server is running.. port 5000");
});
