import { ZepetoIWPButton } from 'ZEPETO.IWP'
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'

export default class IWPController extends ZepetoScriptBehaviour {

    public worldItemId:TestWorldItem = TestWorldItem.WorldItem001;
    private iwpButton:ZepetoIWPButton;
    Start() {    
        this.iwpButton = this.transform.GetComponent<ZepetoIWPButton>();
        if(this.iwpButton) {
            console.log(this.worldItemId.toString());
            this.iwpButton.SetItemId(this.worldItemId.toString());
        }
    }

}

export enum TestWorldItem {
    WorldItem001 = "test_world_item_001",
    WorldItem002 = "test_world_item_002",
    WorldItem003 = "test_world_item_003",
    PackageItem001 = "test_item_pack_001003",
    PackageCoin001 = "test_coin_pack_001",
    PackageCoin002 = "test_coin_pack_002",
}