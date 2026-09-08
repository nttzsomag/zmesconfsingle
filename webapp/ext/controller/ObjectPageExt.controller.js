sap.ui.define([
  "sap/ui/core/mvc/ControllerExtension",
  "sap/m/Dialog",
  "sap/m/Table",
  "sap/m/Column",
  "sap/m/ColumnListItem",
  "sap/m/ObjectIdentifier",
  "sap/m/Button",
  "sap/m/Text",
  "sap/ui/model/Filter"
], function (ControllerExtension, Dialog, Table, Column, ColumnListItem, ObjectIdentifier, Button, Text, Filter) {
  "use strict";

  return ControllerExtension.extend("zmesconfsingle.zmesconfsingle.ext.controller.ObjectPageExt", {
    override: {
      onInit: function () {
        var oView = this.getView();
        var sTableId = "zmesconfsingle.zmesconfsingle::OperationObjectPage--fe::table::_AppNav::LineItem";
        var oTable = oView.byId(sTableId) || sap.ui.getCore().byId(sTableId);
        if (oTable) {
          oTable.attachRowPress(this._onRowPress.bind(this));
        } else {
          console.warn("Table not found:", sTableId);
        }

        this._attachGosButtonPress();
      }
    },

    _attachGosButtonPress: function () {
      var oView = this.getView();
      var oButton = null;

      sap.ui.core.Element.registry.forEach(function (oElement) {
        if (
          oElement.isA &&
          oElement.isA("sap.m.Button") &&
          oElement.getId().indexOf(oView.getId()) === 0 &&
          oElement.getText &&
          oElement.getText() === "Dokumentumok"
        ) {
          oButton = oElement;
        }
      });

      if (oButton) {
        oButton.setIcon("sap-icon://attachment");
        oButton.attachPress(this.onShowGosDocuments.bind(this));
        console.log("### DEBUG: Csatolt dokumentumok gomb megtalálva és bekötve:", oButton.getId());
      } else {
        console.warn("### DEBUG: Csatolt dokumentumok gomb NEM található onInit-ben");
      }
    },

    _onRowPress: function (oEvent) {
      var oBindingContext = oEvent.getParameter("bindingContext");
      if (!oBindingContext) return;
      oBindingContext.requestProperty(["ToSemObj", "ToSemAction"])
        .then(function (aValues) {
          var sToSemObj = aValues[0];
          var sToSemAction = aValues[1];
          if (sToSemObj && sToSemAction) {
            sap.ushell.Container.getService("CrossApplicationNavigation").toExternal({
              target: { semanticObject: sToSemObj, action: sToSemAction }
            });
          }
        });
    },

    onShowGosDocuments: function () {
      var oView = this.getView();
      var oContext = oView.getBindingContext();

      oContext.requestProperty(["Material", "ProductDocumentNumber"]).then(function (aValues) {
        var sMaterial = aValues[0];
        var sProductDocumentNumber = aValues[1];

        console.log("### DEBUG: onShowGosDocuments meghívva ###");
        console.log(" -> Material érték:", sMaterial);
        console.log(" -> ProductDocumentNumber érték:", sProductDocumentNumber);

        var oTable = new Table({
          columns: [
            new Column({ header: new Text({ text: "Leírás" }) }),
            new Column({ header: new Text({ text: "Létrehozva" }) })
          ]
        });

        oTable.bindItems({
          path: "/GosUrlLink",
          model: "gosModel",
          filters: [
            new Filter("BoObjType", "EQ", "BUS1001006"),
            new Filter("BoObjKey", "EQ", sMaterial),
            new Filter("DescriptionUpper", "EQ", sProductDocumentNumber)
          ],
          parameters: {
            $select: "GuidId,Description,CreatedOn,Url"
          },
          template: new ColumnListItem({
            type: "Active",
            press: function (oEvent) {
              var oCtx = oEvent.getSource().getBindingContext("gosModel");
              var sUrl = oCtx.getProperty("Url");
              console.log(" -> sorra kattintva, URL:", sUrl);
              window.open(sUrl, "_blank");
            },
            cells: [
              new ObjectIdentifier({ title: "{gosModel>Description}" }),
              new Text({ text: "{gosModel>CreatedOn}" })
            ]
          }),
          events: {
            dataReceived: function (oEvent) {
              var oData = oEvent.getParameter("data");
              var oErr = oEvent.getParameter("error");
              if (oErr) {
                console.error("### DEBUG: GosUrlLink hívás hiba ###", oErr);
              } else {
                console.log("### DEBUG: GosUrlLink válasz megérkezett ###", oData);
              }
            }
          }
        });

        var oDialog = new Dialog({
          title: "Dokumentumok",
          contentWidth: "30rem",
          content: [oTable],
          beginButton: new Button({
            text: "Bezár",
            press: function () { oDialog.close(); }
          }),
          afterClose: function () { oDialog.destroy(); }
        });

        oView.addDependent(oDialog);
        oDialog.open();
      });
    }
  });
});