import React, { useEffect, useState } from "react";

import { isEmpty } from "lodash";

import Grid from "@material-ui/core/Grid";

import GerritConfig from "./gerrit";
import GeneralConfig from "./general";
import Actions from "./actions";

import API from "../../api";

function Options() {
  // configs
  const [refreshTime, setRefreshTime] = useState(30);
  const [endpoint, setEndpoint] = useState("");
  const [credentials, setCredentials] = useState({ email: "", password: "" });

  // status message
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState("");

  /* ------------------------------------------------------------------------ */
  /*                             Load initial data                            */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // fetch data directly from storage
    const data = await browser.storage.local
      .get("options")
      .then((result) =>
        !isEmpty(result.options) ? JSON.parse(result.options) : {}
      );

    if (!isEmpty(data)) {
      setRefreshTime(data.refreshTime);
      setEndpoint(data.endpoint);
      setCredentials(data.credentials);
    }
  };

  /* ------------------------------------------------------------------------ */
  /*                                 Handlers                                 */
  /* ------------------------------------------------------------------------ */

  const handleClickSave = () => {
    let dummy = "";
    if (endpoint == "") {
      dummy = browser.i18n.getMessage("optionsMessageMissingConfig");
    } else {
      // Save new config in storage
      const data = { refreshTime, endpoint, credentials };
      browser.storage.local.set({ options: JSON.stringify(data) });

      // Inform background script to restart service using this new config
      browser.runtime.sendMessage({ type: API.RESTART_SERVICE });

      dummy = browser.i18n.getMessage("optionsMessageSaveSuccess");
    }

    setMessage(dummy);
    setOpen(true);
  };

  const handleClickTest = async () => {
    let dummy = "";
    if (refreshTime == "" || endpoint == "" || credentials == "") {
      dummy = browser.i18n.getMessage("optionsMessageMissingConfig");
      setMessage(dummy);
      setOpen(true);
      return;
    }

    const data = { refreshTime, endpoint, credentials };
    const result = await browser.runtime.sendMessage({
      type: API.TEST_ENDPOINT,
      data: data,
    });

    if (result.response) {
      dummy = browser.i18n.getMessage("optionsMessageTestSuccess");
    } else {
      dummy = browser.i18n.getMessage("optionsMessageTestFailed");
    }

    setMessage(dummy);
    setOpen(true);
  };

  const handleClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }

    setOpen(false);
  };

  /* ------------------------------------------------------------------------ */
  /*                                 Rendering                                */
  /* ------------------------------------------------------------------------ */

  return (
    <div style={{ height: "100%", width: "95%", margin: "auto" }}>
      <Grid
        container
        direction="column"
        justifyContent="space-between"
        alignItems="flex-end"
        spacing={3}
      >
        <Grid item container xs={12}>
          <GeneralConfig
            data={refreshTime}
            onChangeRefreshTime={setRefreshTime}
          />
        </Grid>

        <Grid item container xs={12}>
          <GerritConfig
            endpoint={endpoint}
            credentials={credentials}
            onChangeEndpoint={setEndpoint}
            onChangeCredentials={setCredentials}
          />
        </Grid>
      </Grid>

      <Actions
        showMessage={open}
        message={message}
        onClickTest={handleClickTest}
        onClickSave={handleClickSave}
        onClose={handleClose}
      />
    </div>
  );
}

export default Options;
