/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "com/lycrabeams/model/models"
],
    function (UIComponent, Device, models) {
        "use strict";

        return UIComponent.extend("com.lycrabeams.Component", {
            isHandheld: false,
            metadata: {
                manifest: "json"
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                this.setMobileOnHandheld();
                    // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                // enable routing
                this.getRouter().initialize();

                // set the device model
                this.setModel(models.createDeviceModel(), "device");

                // Create the model and load the data from Local Json file
                var oModel = new sap.ui.model.json.JSONModel();
                this.setModel(oModel, "SOModel");
                //sap.ui.core.BusyIndicator.show();
                var deviceModel = models.createDeviceModel();
                deviceModel.setProperty("/system/handheld", this.isHandheld);
                this.setModel(deviceModel, "device");
                sap.ui.getCore().setModel(deviceModel, "device");
            },
            setMobileOnHandheld: function () {
                if (sap.ui.Device.os.name === "linux" && sap.ui.Device.system.combi) {
                    this.isHandheld = true;
                    sap.ui.Device.system.desktop = false;
                    sap.ui.Device.system.phone = true;
                    sap.ui.Device.system.tablet = false;
                    sap.ui.Device.system.combi = false;
                }
            }
        });
    }
);