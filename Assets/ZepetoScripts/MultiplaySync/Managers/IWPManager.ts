import { Item } from 'ZEPETO.IWP';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'

export default class IWPManager extends ZepetoScriptBehaviour {
    
    /* IWP */
    OnPurchaseComplete(item : Item) {
        console.log("OnPurchaseComplete");
        console.log(`item.itemId : ${item.itemId}`);
        console.log(`item.name : ${item.name}`);
        console.log(`item.description : ${item.description}`);
        console.log(`item.price : ${item.price}`);
    }
    
    OnPurchaseFailed(error : Object) {
        console.log(`OnPurchaseFailed : ${error}`);
    }

}