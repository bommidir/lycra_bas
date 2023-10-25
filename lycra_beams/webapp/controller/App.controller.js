sap.ui.define([
      "./BaseController",
    ],
    function(BaseController) {
      "use strict";
  
      return BaseController.extend("com.lycrabeams.controller.App", {
        onInit() {
          this.oLocalEventBus = this.getOwnerComponent().getEventBus();
        }
      });
});
  