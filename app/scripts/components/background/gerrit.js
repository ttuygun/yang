import { isEmpty, pick } from "lodash";
import axios from "axios";

/* -------------------------------------------------------------------------- */
/*                                 Gerrit API                                 */
/* -------------------------------------------------------------------------- */

const gerrit = {
  async query(options, chid) {
    const url = `${options.endpoint}/changes/${chid}/detail`;

    let data = null;
    try {
      data = await axios
        .get(
          url, {
            auth: {
              username: options.credentials.email,
              password: options.credentials.password,
            },
          }
        )
        .then((response) => (response.status == 200 ? response.data : {}));
    } catch (err) {
      console.log("Change-Id:", chid, "Error:", err);
      data = { id: chid.toString(), error: true };
    }

    // Simply return empty
    if (isEmpty(data) || data.error) {
      return data;
    }

    // Otherwise, parse it
    const object = JSON.parse(data.toString().replace(")]}'", ""));
    const raw = pick(object, ["_number", "subject", "status", "labels"]);
    const change = convertGerritData(raw);

    return change;
  },

  /* ------------------------------------------------------------------------ */

  async test(endpoint, credentials) {
    const url = `${endpoint}/config/server/version`;

    let result = false;
    try {
      result = await axios
        .get(
          url, {
            auth: {
              username: credentials.email,
              password: credentials.password,
            },
          }
        )
        .then((response) => (response.status == 200 ? true : false));
    } catch (err) {
      console.log("Error testing endpoint:", endpoint);
      if (err.response !== undefined) {
        console.log("err code:", err.response.status);
      }
    }

    return result;
  },
};

/* --------------------- Get summarized value for label --------------------- */

// This algorithm is based on this premise:
//
// "The combined label vote is calculated in the following order (from highest
// to lowest): REJECTED > APPROVED > DISLIKED > RECOMMENDED."
//
// Source:
// https://gerrit-review.googlesource.com/Documentation/rest-api-changes.html#get-change-detail

function filterLabel(items) {
  let account_id = 0,
    value = 0;

  const summarizedFields = ["rejected", "approved", "disliked", "recommended"];

  for (const field of summarizedFields) {
    // Get account id from summarized value
    if (Object.prototype.hasOwnProperty.call(items, field)) {
      account_id = items[field]["_account_id"];
      break;
    }
  }

  if (account_id != 0) {
    // filter "value" field from the matching account id
    value = items["all"]
      .filter((obj) => obj._account_id == account_id)
      .map(function (obj) {
        return obj.value;
      })[0];
  }

  return value;
}

/* ----------- Convert JSON object from REST API to custom object ----------- */

function convertGerritData(raw) {
  let change = pick(raw, ["subject", "status"]);
  change.id = raw._number.toString();
  change.verified = 0;
  change.codeReview = 0;

  // filter "Verified" label
  change.verified = filterLabel(raw.labels["Verified"]);

  // filter "Code-Review" label
  change.codeReview = filterLabel(raw.labels["Code-Review"]);

  return change;
}

export default gerrit;
