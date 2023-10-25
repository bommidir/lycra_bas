 
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/ndc/BarcodeScanner",
    "sap/ui/core/routing/History"
  ], function (Controller, UIComponent,BarcodeScanner,History) {
  
    "use strict";
   
    return Controller.extend("com.lycrabeams.controller.BaseController", {
      oBusyDialog: new sap.m.BusyDialog,
      // some basic functionalities
   
      // just this.getRouter() ...
      getRouter: function() {
       
        // ... instead of
        return UIComponent.getRouterFor(this);
   
      },
   
      // just this.getModel() ...
      getModel: function(sName) {
     
        // ... instead of
        return this.getView().getModel(sName);
   
      },
   
      // just this.setModel() ...
      setModel: function(oModel, sName) {
   
        // ... instead of
        return this.getView().setModel(oModel, sName);
   
      },
   
      // just this.getResoureBundle() ... 
      getResourceBundle: function () {
   
        // ... instead of
        return this.getOwnerComponent().getModel("i18n").getResourceBundle();
   
      },

      getText: function (sTextKey) {
        return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sTextKey);
      },
   
      // calculate something
      randomCalculations: function(fValue1, fValue2) {
   
        // do some calculations
   
      },

      _onScan: function(){
        return new Promise((resolve, reject) => {
          BarcodeScanner.scan(
            function (oResult) { 
              if(!oResult.cancelled){
                resolve( oResult.text );
              }else
                resolve( "" );
            },
            function (oError) { 
              reject( oError ); 
            }
          );
        });
      },

      setBussy: function (bValue) {
        if(bValue){
                  this.oBusyDialog.open();
              }else
                  this.oBusyDialog.close();
      },

      _onChangeInputState: function(oInput, state, stateText){
        var valueStateText = stateText ? this.getResourceBundle().getText( stateText ) : "";
        oInput.setValueState( state );
        oInput.setValueStateText( valueStateText );
        if( valueStateText ) oInput.focus();
      },

      checkCurrentView: function( viewName ){
        var oHistory = History.getInstance();
        var currentRoute = oHistory.aHistory[oHistory.iHistoryPosition],
          currentView = currentRoute.split("/")[0];
        currentView = currentView ? currentView : "Detail";				
        return viewName === currentView;
      }
      
   
    });
   
  });