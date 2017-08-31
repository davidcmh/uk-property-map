/* raw data from following API http://lr-pres-dev-c.epimorphics.net/landregistry/query */

CREATE TABLE addresses (
    address TEXT PRIMARY KEY,
    paon TEXT,
    saon TEXT,
    street TEXT,
    town TEXT,
    county TEXT,
    postcode TEXT
);
