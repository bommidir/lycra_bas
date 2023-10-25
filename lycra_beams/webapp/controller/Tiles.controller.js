sap.ui.define([
    "./BaseController"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (BaseController) {
        "use strict";

        return BaseController.extend("com.lycrabeams.controller.Tiles", {
            onInit: function () {

            },
            onPressTile: function(oEvt){
                if(oEvt.getSource().getHeader() === 'With Sales Order'){
                    this.getRouter().navTo("WithSO");
                } else{
                    this.getRouter().navTo("WithoutSO");
                }
            }
        });
    });
