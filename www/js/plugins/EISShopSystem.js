"use strict";

//=============================================================================
// EISShopSystem.js                                                             
//=============================================================================

/*:
*
* @author Kino
* @plugindesc This plugin handles managing shops in the game giving you more shop features.
*
* @help
* Version: 1.01
* This plugin lets you create varying shops.
* 
* Manager Helpers
* KR.ShopManager.createSellShop()
* -Creates a shop you can only sell items to.
*
* KR.ShopManager.adjustSellPrice(sellPoint);
* - This adjusts the sellprice for the shop by a percentage amount.
* Example: KR.ShopManager.adjustSellPrice(2.0)
* The above doubles the amount items sell for in game based off their original buy price.
* Note: setting it to 0.0 will default to the game's original setting of half the buy price.
* 
* KR.ShopManager.createRandomizedPriceShop(buyMin, buyMax, sellMin, sellMax)
* -This shop sets a shop with randomized item prices. Everytime you enter the shop
* the price changes for both buy and sell based on the above parameters.
* Example: KR.ShopManager.createRandomizedPriceShop(0, 999, 200, 300);
*
* KR.ShopManager.customizeItemBuyPrice(itemInformation)
* -This changes the item buy price based on it's position in the list. This also overrides
* the regular shops buying prices for that item.
* Example: KR.ShopManager.customizeItemBuyPrice([2,'random', 50, 100],[1, 'random', 35, 75]);
*
* KR.ShopManager.customizeItemSellPrice(itemInformation)
* - This changes the item sell price based on the item id, and the item type. This also overrides
* any of the randomized prices from the randomized shop.
* Example: KR.ShopManager.customizeItemSellPrice(['item',1,'random', 333, 444]);
* - This would set the item with id 1 in your item database to a number between 333 and 444.
* 
* ShopManager.createStockableShop(shopId, itemInformation,);
* This creates a shop with stock for a specific item with that id.
* Example: KR.ShopManager.createStockableShop(1, ['item', 1, 3])
* This would set the stock for an 'item' type item with the id 1 to 3.
* Note: You can have items with no stock alongside items with stock.
* 
* ShopManager.restockShop(shopId, itemInformation)
* This restocks an item at the shop with that specified ID.
* Example: KR.ShopManager.restockShop(1, ['item',1, 20], ['item', 6, 20]);
* The above would add 20 to the current stock of shop 1 with the item id of 1.
* Note: Items sold to a stock shop, update the shops current stock for that item
* if it is in the buy window.
*
* Extra Notes: You can combine some of these directives together when creating your shop.
* 
//=============================================================================
//  Contact Information
//=============================================================================
*
* Contact me via twitter: EISKino, or on the rpg maker forums.
* Username on forums: Kino.
*
* Forum Link: http://forums.rpgmakerweb.com/index.php?/profile/75879-kino/
* Website Link: http://endlessillusoft.com/
* Twitter Link: https://twitter.com/EISKino
* Patreon Link: https://www.patreon.com/EISKino
*
* Hope this plugin helps, and enjoy!
* --Kino
*/

//=============================================================================
// Namespace Initialization                                                             
//=============================================================================

var KR = KR || {};
KR.Plugins = KR.Plugins || {};
KR.Helpers = KR.Helpers || {};

(function ($) {

  //=============================================================================
  // Plugin Parameters                                                           
  //=============================================================================

  var parameters = PluginManager.parameters("EISShopSystem");

  $.Plugins.ShopSystem = function () {
    'use strict';

    function ShopManager() {}

    ShopManager.sellShopOnly = false;
    ShopManager.randomizedShop = false;
    ShopManager.commonEventShop = false;
    ShopManager.baselineVarianceShop = false;
    ShopManager.variableShop = false;
    ShopManager.stockableShop = false;
    ShopManager.shopId = null;
    ShopManager.sellPoint = 0.0;
    ShopManager.randomizeBuyMin = 0;
    ShopManager.randomizeBuyMax = 1;
    ShopManager.randomizeSellMin = 0;
    ShopManager.randomizeSellMax = 1;
    ShopManager.currentData = null;
    ShopManager.itemData = null;
    ShopManager.sellItemData = null;
    ShopManager.currentShop = null;
    ShopManager.parameterList = [];
    ShopManager.sessionTimeStamp = 0;
    ShopManager.buyList = [];
    ShopManager.sellList = [];
    ShopManager.stockableShopList = [];
    ShopManager.buyItem = null;
    ShopManager.currentPrice = null;
    ShopManager.runFunction = null;
    ShopManager.commonEventRe = /\W*<commonEventId:\W*(\d+)\W*>\W*/ig;

    ShopManager.createSession = function () {
      this.sessionTimeStamp = Date.now();
    };

    ShopManager.getSession = function () {
      return this.sessionTimeStamp;
    };

    ShopManager.isSellShop = function () {
      return this.sellShopOnly;
    };

    ShopManager.isRandomizedShop = function () {
      return this.randomizedShop;
    };

    ShopManager.isCommonEventShop = function () {
      return this.commonEventShop;
    };

    ShopManager.isBaselineVarianceShop = function () {
      return this.baselineVarianceShop;
    };

    ShopManager.isVariableShop = function () {
      return this.variableShop;
    };

    ShopManager.isStockableShop = function () {
      return this.stockableShop;
    };

    ShopManager.createSellShop = function () {
      this.sellShopOnly = true;
    };

    ShopManager.createRandomizedPriceShop = function (buyMin, buyMax, sellMin, sellMax) {
      this.randomizedShop = true;
      this.randomizeBuyMin = buyMin;
      this.randomizeBuyMax = buyMax;
      this.randomizeSellMin = sellMin;
      this.randomizeSellMax = sellMax;
    };

    ShopManager.createStockableShop = function (shopId, array) {
      this.stockableShop = true;
      this.setShopId(shopId);
      var shop = {};
      shop.stockList = [];
      shop.shopId = shopId;
      for (var i = 0; i < array.length; i++) {
        shop.stockList.push(array[i]);
      }
      this.addStockableShop(shop);
      console.log(this.stockableShopList);
    };

    ShopManager.searchShopList = function (shopId) {
      for (var i = 0; i < this.stockableShopList.length; i++) {
        if (this.stockableShopList[i].shopId === shopId) return true;
      }
      return false;
    };

    ShopManager.addStockableShop = function (shop) {
      if (!this.searchShopList(shop.shopId)) {
        console.log("Shop Doesn't Exist -- Can Add Shop");
        this.stockableShopList.push(shop);
      }
    };

    ShopManager.updateShopStockList = function (item) {
      var shop = this.getCurrentShop();
      for (var i = 0; i < shop.stockList.length; i++) {
        if (shop.stockList[i][1] === item.id) {
          if (typeof item.stock !== 'undefined') shop.stockList[i][2] = item.stock;
        }
      }
    };

    ShopManager.restockShop = function () {
      var args = arguments[0];
      var shopId = args[0];
      for (var i = 1; i < args.length; i++) {
        this.updateItemStock(shopId, args[i][0], args[i][1], args[i][2]);
      }
    };

    ShopManager.updateItemStock = function (shopId, type, id, amount) {
      var shop = this.getShop(shopId);
      for (var i = 0; i < shop.stockList.length; i++) {
        if (shop.stockList[i][1] === id) {
          if (shop.stockList[i][0] === type) shop.stockList[i][2] += amount;
        }
      }
    };

    ShopManager.getShop = function (shopId) {
      for (var i = 0; i < this.stockableShopList.length; i++) {
        if (this.stockableShopList[i].shopId === shopId) return this.stockableShopList[i];
      }
    };

    ShopManager.checkItemMode = function (itemMode, params) {
      switch (itemMode) {
        case "random":
          this.currentPrice = this.randomizeItemPrice(params[0], params[1]);
          break;
        default:
          console.log("No Item Mode");
      }
    };

    ShopManager.checkBuyItemPosition = function (itemPosition) {
      for (var i = 0; i < this.buyList.length; i++) {
        if (itemPosition === this.buyList[i].position) {
          this.buyItem = this.buyList[i];
          return true;
        }
      }
      return false;
    };

    ShopManager.processItemPrice = function (itemMode, params) {
      this.checkItemMode(itemMode, params);
      return this.currentPrice;
    };

    ShopManager.createList = function (array) {
      for (var i = 0; i < this.parameterList.length; i++) {
        this.obtainParameters(this.parameterList[i]);
        array.push({ position: this.getCurrentItemData()[0],
          price: this.processItemPrice(this.getCurrentItemData()[1], this.getCurrentItemData().splice(2, 2)) });
      }
    };

    ShopManager.createSellList = function (array) {
      for (var i = 0; i < this.parameterList.length; i++) {
        this.obtainParameters(this.parameterList[i]);
        array.push({ itemType: this.getCurrentItemData()[0], itemId: this.getCurrentItemData()[1],
          price: this.processItemPrice(this.getCurrentItemData()[2], this.getCurrentItemData().splice(3, 2)) });
      }
    };

    ShopManager.checkSellItemPosition = function () {
      for (var i = 0; i < this.sellList.length; i++) {
        if (itemPosition === this.sellList[i].position) {
          this.sellItem = this.sellList[i];
          return true;
        }
      }
      return false;
    };

    ShopManager.customizeItemBuyPrice = function () {
      for (var i = 0; i < arguments[0].length; i++) {
        this.getItemParameters(arguments[0][i]);
      }
      this.createList(this.buyList);
    };

    ShopManager.customizeItemSellPrice = function () {
      for (var i = 0; i < arguments[0].length; i++) {
        this.getItemParameters(arguments[0][i]);
      }
      this.createSellList(this.sellList);
    };

    ShopManager.inSellList = function (item) {
      for (var i = 0; i < this.sellList.length; i++) {
        if (this.sellList[i].itemId === item.id) {
          if (this.itemTypeMatch(this.sellList[i].itemType, item)) {
            this.sellItemData = this.sellList[i];
            return true;
          }
        }
      }
      return false;
    };

    ShopManager.applyItemPrice = function (item) {
      item.price = this.sellItemData.price;
    };

    ShopManager.obtainParameters = function (array) {
      this.currentData = array;
    };

    ShopManager.getItemParameters = function (itemParams) {
      this.parameterList.push(itemParams);
    };

    ShopManager.clearItemParameters = function () {
      this.parameterList.length = 0;
    };

    ShopManager.clearBuyList = function () {
      this.buyList.length = 0;
    };

    ShopManager.clearSellList = function () {
      this.sellList.length = 0;
    };

    ShopManager.randomizeItemPrice = function (min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    ShopManager.randomizeBuyPrice = function () {
      return Math.floor(Math.random() * (this.randomizeBuyMax - this.randomizeBuyMin + 1)) + this.randomizeBuyMin;
    };

    ShopManager.randomizeSellPrice = function () {
      return Math.floor(Math.random() * (this.randomizeSellMax - this.randomizeSellMin + 1)) + this.randomizeSellMin;
    };

    ShopManager.adjustSellPrice = function (floatValue) {
      this.sellPoint = floatValue;
    };

    ShopManager.setShopId = function (shopId) {
      this.shopId = shopId;
    };

    ShopManager.setItemData = function (itemData) {
      this.itemData = itemData;
    };

    ShopManager.getItemData = function () {
      return this.itemData;
    };

    ShopManager.getCurrentShop = function () {
      return this.getShop(this.getCurrentShopId());
    };

    ShopManager.checkItemInStockList = function (shop, itemId) {
      for (var i = 0; i < this.shop.stockList.length; i++) {
        if (shop.stockList[i][1] === itemId) return true;
      }
      return false;
    };

    ShopManager.applyStockListItem = function (shop, item) {
      for (var i = 0; i < shop.stockList.length; i++) {
        if (shop.stockList[i][1] === item.id && this.itemTypeMatch(shop.stockList[i][0], item)) {
          console.log("Added Item");
          item.stock = shop.stockList[i][2];
        } else item.canBuy = this.getSession();
      }
    };

    ShopManager.itemTypeMatch = function (string, item) {
      switch (string) {
        case 'item':
          return DataManager.isItem(item) && item.itypeId === 1;
        case 'weapon':
          return DataManager.isWeapon(item);
        case 'armor':
          return DataManager.isArmor(item);
        case 'keyItem':
          return DataManager.isItem(item) && item.itypeId === 2;
        default:
          return false;
      }
    };

    ShopManager.getCurrentItemData = function () {
      return this.currentData;
    };

    ShopManager.getBuyItemPrice = function () {
      return this.buyItem.price;
    };

    ShopManager.getSellPoint = function () {
      return this.sellPoint;
    };

    ShopManager.getCurrentShopId = function () {
      return this.shopId;
    };

    ShopManager.eraseAllShopTypes = function () {
      this.sellShopOnly = false;
      this.randomizedShop = false;
      this.commonEventShop = false;
      this.baselineVarianceShop = false;
      this.variableShop = false;
      this.stockableShop = false;
      this.clearItemParameters();
      this.clearSellList();
      this.clearBuyList();
    };

    //=============================================================================
    // DataManager                                                             
    //=============================================================================

    var EISDataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function () {
      var contents = {};
      contents = EISDataManager_makeSaveContents.call(this);
      contents.stockableShopList = ShopManager.stockableShopList;
      return contents;
    };

    var EISDataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function (contents) {
      EISDataManager_extractSaveContents.call(this, contents);
      ShopManager.stockableShopList = contents.stockableShopList;
    };

    //=============================================================================
    // Scene_Shop                                                         
    //=============================================================================
    var _SceneShop_initialize = Scene_Shop.prototype.initialize;
    Scene_Shop.prototype.initialize = function () {
      _SceneShop_initialize.call(this);
      this._isSelling = false;
    };

    var SceneShop_prepare = Scene_Shop.prototype.prepare;
    Scene_Shop.prototype.prepare = function (goods, purchaseOnly) {
      this.getSellOnly();
      SceneShop_prepare.call(this, goods, purchaseOnly);
      ShopManager.createSession();
    };

    Scene_Shop.prototype.getSellOnly = function () {
      this._sellOnly = ShopManager.sellShopOnly;
    };

    Scene_Shop.prototype.eraseSellOnly = function () {
      ShopManager.sellShopOnly = false;
    };

    Scene_Shop.prototype.doBuy = function (number) {
      $gameParty.loseGold(number * this.buyingPrice());
      $gameParty.gainItem(this._item, number);
      if (ShopManager.isCommonEventShop()) this.processItemCommonEvent(this._item, number);
      if (ShopManager.isStockableShop()) this.updateItemStock(number * -1);
    };

    Scene_Shop.prototype.doSell = function (number) {
      $gameParty.gainGold(number * this.sellingPrice());
      $gameParty.loseItem(this._item, number);
      if (ShopManager.isStockableShop()) {
        this.updateItemStock(number);
      }
    };

    Scene_Shop.prototype.updateItemStock = function (number) {
      if (typeof this._item.stock !== 'undefined') this._item.stock += number;
    };

    Scene_Shop.prototype.createCommandWindow = function () {
      this._commandWindow = new Window_ShopCommand(this._goldWindow.x, this._purchaseOnly, this._sellOnly);
      this._commandWindow.y = this._helpWindow.height;
      this._commandWindow.setHandler('buy', this.commandBuy.bind(this));
      this._commandWindow.setHandler('sell', this.commandSell.bind(this));
      this._commandWindow.setHandler('cancel', this.popScene.bind(this));
      this.addWindow(this._commandWindow);
    };

    Scene_Shop.prototype.sellingPrice = function () {
      return this.processSellingPrice();
    };

    Scene_Shop.prototype.processSellingPrice = function () {
      if (ShopManager.inSellList(this._item)) {
        return this._item.price;
      } else if (ShopManager.isRandomizedShop()) {
        return ShopManager.getSellPoint() < 0.001 ? Math.floor(this.getRandomPrice() / 2) : Math.floor(this.getRandomPrice() * ShopManager.getSellPoint());
      } else return ShopManager.getSellPoint() < 0.001 ? Math.floor(this._item.price / 2) : Math.floor(this._item.price * ShopManager.getSellPoint());
    };

    Scene_Shop.prototype.getRandomPrice = function () {
      if (this._item.randomPrice !== undefined) {
        console.log(this._item.randomPrice);
        return this._item.randomPrice;
      }
    };

    Scene_Shop.prototype.terminate = function () {
      if (ShopManager.isStockableShop()) this.updateAllItemsStock();
      ShopManager.eraseAllShopTypes();
    };

    Scene_Shop.prototype.updateAllItemsStock = function () {
      for (var i = 0; i < this._buyWindow._data.length; i++) {
        ShopManager.updateShopStockList(this._buyWindow._data[i]);
      }
    };

    Scene_Shop.prototype.processItemCommonEvent = function (item, number) {
      var cmnEventInfo = ShopManager.commonEventRe.exec(item.note);
      for (var i = 0; i < number; i++) {
        if (cmnEventInfo !== null) $gameTemp.reserveCommonEvent(cmnEventInfo[1]);
      }
      ShopManager.commonEventRe.lastIndex = 0;
    };

    var _SceneShop_onSellOk = Scene_Shop.prototype.onSellOk;
    Scene_Shop.prototype.onSellOk = function () {
      _SceneShop_onSellOk.call(this);
      this._isSelling = true;
    };

    var _SceneShop_onSellCancel = Scene_Shop.prototype.onSellCancel;
    Scene_Shop.prototype.onSellCancel = function () {
      _SceneShop_onSellCancel.call(this);
      this._isSelling = false;
    };

    Scene_Shop.prototype.isSelling = function () {
      return this._isSelling;
    };

    //=============================================================================
    // Window_ShopCommand                                                             
    //=============================================================================
    var EISWindowShopCommand_initialize = Window_ShopCommand.prototype.initialize;
    Window_ShopCommand.prototype.initialize = function (width, purchaseOnly, sellOnly) {
      this._sellOnly = typeof sellOnly !== 'undefined' ? sellOnly : false;
      EISWindowShopCommand_initialize.call(this, width, purchaseOnly);
    };

    Window_ShopCommand.prototype.makeCommandList = function () {
      if (!this._sellOnly) this.addCommand(TextManager.buy, 'buy');
      this.addCommand(TextManager.sell, 'sell', !this._purchaseOnly);
      this.addCommand(TextManager.cancel, 'cancel');
    };

    //=============================================================================
    // Window_ShopBuy                                                             
    //=============================================================================
    Window_ShopBuy.prototype.initialize = function (x, y, height, shopGoods) {
      var width = this.windowWidth();
      Window_Selectable.prototype.initialize.call(this, x, y, width, height);
      this._shopGoods = shopGoods;
      this._money = 0;
      this.makeItemList();
      if (ShopManager.isStockableShop()) this.prepareStockShop();
      this.refresh();
      this.select(0);
    };

    Window_ShopBuy.prototype.setMoney = function (money) {
      this._money = money;
      this.refresh();
    };

    var EISWindowShopyBuy_update = Window_ShopBuy.prototype.update;
    Window_ShopBuy.prototype.update = function () {
      EISWindowShopyBuy_update.call(this);
    };

    var EISWindowShopBuy_isEnabled = Window_ShopBuy.prototype.isEnabled;
    Window_ShopBuy.prototype.isEnabled = function (item) {
      if (ShopManager.isStockableShop() && typeof item.stock !== 'undefined') {
        console.log(item.stock);
        return item.stock > 0 && this.price(item) <= this._money && !$gameParty.hasMaxItems(item) ? true : false;
      } else {
        return EISWindowShopBuy_isEnabled.call(this, item);
      }
    };

    Window_ShopBuy.prototype.refresh = function () {
      this.createContents();
      this.drawAllItems();
    };

    Window_ShopBuy.prototype.makeItemList = function () {
      this._data = [];
      this._price = [];
      this._shopGoods.forEach(function (goods) {
        var item = null;
        switch (goods[0]) {
          case 0:
            item = $dataItems[goods[1]];
            break;
          case 1:
            item = $dataWeapons[goods[1]];
            break;
          case 2:
            item = $dataArmors[goods[1]];
            break;
        }
        if (item) {
          this._data.push(item);
          this.addItemPrice(item, goods);
        }
      }, this);
    };

    Window_ShopBuy.prototype.prepareStockShop = function () {
      for (var i = 0; i < this._data.length; i++) {
        ShopManager.applyStockListItem(ShopManager.getCurrentShop(), this._data[i]);
      }
    };

    Window_ShopBuy.prototype.addItemPrice = function (item, goods) {
      if (ShopManager.checkBuyItemPosition(this._data.indexOf(item))) {
        this._price.push(ShopManager.getBuyItemPrice());
      } else if (ShopManager.isRandomizedShop()) {
        this._price.push(ShopManager.randomizeBuyPrice());
      } else this._price.push(goods[2] === 0 ? item.price : goods[3]);
    };

    Window_ShopBuy.prototype.price = function (item) {
      return this._price[this._data.indexOf(item)] || 0;
    };

    //=============================================================================
    // Window_ShopSell                                                             
    //=============================================================================
    var EISWindowShopSell_initialize = Window_ShopSell.prototype.initialize;
    Window_ShopSell.prototype.initialize = function (x, y, width, height) {
      EISWindowShopSell_initialize.call(this, x, y, width, height);
    };

    Window_ShopSell.prototype.refresh = function () {
      this.makeItemList();
      if (ShopManager.isRandomizedShop()) this.processListPrice();
      this.createContents();
      this.drawAllItems();
    };

    Window_ShopSell.prototype.processListPrice = function () {
      for (var i = 0; i < this._data.length; i++) {
        if (ShopManager.inSellList(this._data[i])) {
          ShopManager.applyItemPrice(this._data[i]);
        } else if (this._data[i].randomPrice === undefined || this._data[i].shTimeStamp < ShopManager.getSession()) {
          this._data[i].randomPrice = ShopManager.randomizeSellPrice();
          this._data[i].shTimeStamp = ShopManager.getSession();
        }
      }
    };

    //=============================================================================
    // Window_ShopStatus                                                             
    //=============================================================================
    var EISWindowShopStatus_initialize = Window_ShopStatus.prototype.initialize;
    Window_ShopStatus.prototype.initialize = function (x, y, width, height) {
      EISWindowShopStatus_initialize.call(this, x, y, width, height);
    };

    Window_ShopStatus.prototype.setupStockableShop = function () {
      this.shop = ShopManager.getCurrentShop();
    };

    Window_ShopStatus.prototype.refresh = function () {
      this.contents.clear();
      if (this._item) {
        var x = this.textPadding();
        this.drawPossesions(x, 0);
        if (this.isEquipItem()) {
          this.drawEquipInfo(x, this.lineHeight() * 2);
        }
      }
    };

    Window_ShopStatus.prototype.drawPossesions = function (x, y) {
      if (ShopManager.isStockableShop()) {
        this.drawShopPossession(x, y);
        this.drawPossession(x, y + 40);
      } else this.drawPossession(x, y);
    };

    Window_ShopStatus.prototype.drawShopPossession = function (x, y) {
      var width = this.contents.width - this.textPadding() - x;
      var possessionWidth = this.textWidth('0000');
      this.changeTextColor(this.systemColor());
      this.drawText("Shop Possesion", x, y, width - possessionWidth);
      this.resetTextColor();
      var text = this._item.canBuy === ShopManager.getSession() ? '∞' : 'X';
      var stock = typeof this._item.stock !== 'undefined' ? this._item.stock : text;
      this.drawText(stock, x, y, width, 'right');
    };
    //=============================================================================
    // Window_ShopNumber                                                             
    //=============================================================================
    Window_ShopNumber.prototype.changeNumber = function (amount) {
      var scene = SceneManager._scene;
      var lastNumber = this._number;
      if (ShopManager.isStockableShop() && !scene.isSelling()) {
        this._max = typeof this._item.stock !== 'undefined' && this._item.stock < this._max ? this._item.stock : this._max;
      }
      this._number = (this._number + amount).clamp(1, this._max);
      if (this._number !== lastNumber) {
        SoundManager.playCursor();
        this.refresh();
      }
    };

    //=============================================================================
    // Managers                                                             
    //=============================================================================

    $.ShopManager = {
      createSellShop: ShopManager.createSellShop.bind(ShopManager),
      createRandomizedPriceShop: function createRandomizedPriceShop(buyMin, buyMax, sellMin, sellMax) {
        ShopManager.createRandomizedPriceShop(buyMin, buyMax, sellMin, sellMax);
      },
      adjustSellPrice: ShopManager.adjustSellPrice.bind(ShopManager),
      customizeItemBuyPrice: function customizeItemBuyPrice() {
        ShopManager.customizeItemBuyPrice(arguments);
      },
      customizeItemSellPrice: function customizeItemSellPrice() {
        ShopManager.customizeItemSellPrice(arguments);
      },
      createStockableShop: function createStockableShop() {
        var shopId = Array.prototype.splice.call(arguments, 0, 1)[0];
        ShopManager.createStockableShop(shopId, arguments);
      },
      restockShop: function restockShop() {
        ShopManager.restockShop(arguments);
      }
    };
  };

  $.Plugins.ShopSystem();
})(KR);