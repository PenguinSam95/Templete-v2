import { Animator, GameObject, HumanBodyBones, Resources, Transform } from 'UnityEngine';
import { Button } from 'UnityEngine.UI';
import { UIZepetoPlayerControl, ZepetoPlayers } from 'ZEPETO.Character.Controller';
import { Room, RoomData } from 'ZEPETO.Multiplay';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import { ZepetoWorldMultiplay } from 'ZEPETO.World';
import JoystickController from '../Sample Code/JoystickController';
import { VehicleType } from '../Sample Code/VehicleController';

export default class EquipManager extends ZepetoScriptBehaviour {
    
    private multiplay: ZepetoWorldMultiplay;
    private room: Room;
    @SerializeField() private exitButton:Button;

    private equipName:string;
    private bone:HumanBodyBones = HumanBodyBones.Head;
    private originGravity:number = 0;

    Start() {
        this.multiplay = GameObject.FindObjectOfType<ZepetoWorldMultiplay>();
        this.multiplay.RoomJoined += (room: Room) => {
            this.room = room;
            this.room.AddMessageHandler("Equip", (equipData:EquipData) => {
                this.EquipItem(equipData);
            });
            this.room.AddMessageHandler("EquipChange", (equipData:EquipData) => {
                if(!equipData.prevItemName) return;
                this.UnEquipItem(equipData);
                this.EquipItem(equipData);
            });
            this.room.AddMessageHandler("Unequip", (equipData:EquipData) => {
                if(!equipData.prevItemName) return;
                this.UnEquipItem(equipData);
            });
        }
    }
    
    private UnEquipItem(equipData:EquipData) {
        const anim:Animator = ZepetoPlayers.instance.GetPlayer(equipData.sessionId).character.ZepetoAnimator;
        const bone = anim.GetBoneTransform(equipData.bone);
        const prevName = equipData.prevItemName+"-"+equipData.bone.toString();
        for(const trans of bone.GetComponentsInChildren<Transform>()) {
            if(trans.name != prevName) continue;
            GameObject.Destroy(trans.gameObject);
            if(trans.name.split("-")[0] == "Jetpack_Item") {
                this.UnequipJetpack();
            }
        }
    }
    
    private EquipItem(equipData:EquipData) {
        const anim:Animator = ZepetoPlayers.instance.GetPlayer(equipData.sessionId).character.ZepetoAnimator;
        const bone = anim.GetBoneTransform(equipData.bone);
        const prefab = Resources.Load<GameObject>(equipData.itemName);
        const equip = GameObject.Instantiate(prefab, bone) as GameObject;
        equip.name = equipData.itemName+"-"+equipData.bone.toString();

        if(equipData.itemName == "Jetpack_Item") {
            this.EquipJetpack();
        }
    }

    private EquipJetpack() {
        this.bone = HumanBodyBones.UpperChest;
        this.exitButton.gameObject.SetActive(true);
        this.exitButton.onClick.AddListener( () => this.ScriptJetpack() );
        this.ControllerSet(VehicleType.Jetpack);
    }

    private UnequipJetpack() {
        this.ControllerReset(VehicleType.Jetpack);
        this.exitButton.onClick.RemoveListener( this.ScriptJetpack );
        this.exitButton.gameObject.SetActive(false);
    }

    private ScriptJetpack() {
        const data = new RoomData();
        data.Add("name", this.equipName);
        data.Add("attach", this.bone);
        this.room.Send("Unequip", data.GetObject());
    }
    
    /* Controller Set */
    private ControllerSet(vehicleType:VehicleType) {
       const controller = ZepetoPlayers.instance.gameObject.GetComponentInChildren<UIZepetoPlayerControl>();
       if(vehicleType == VehicleType.Jetpack) {
            controller.transform.GetChild(0).GetChild(7).gameObject.SetActive(true);
            const joyConU = controller.transform.GetChild(0).GetChild(7).GetChild(0).gameObject.GetComponent<JoystickController>();
            const joyConD = controller.transform.GetChild(0).GetChild(7).GetChild(1).gameObject.GetComponent<JoystickController>();
            // if(joyConU) joyConU.target = this;
            // if(joyConD) joyConD.target = this;
            this.originGravity = ZepetoPlayers.instance.motionV2Data.Gravity;
            if(3*2 < this.originGravity)
                ZepetoPlayers.instance.motionV2Data.Gravity = 3;
            else
                ZepetoPlayers.instance.motionV2Data.Gravity = 0;
       }
       controller.transform.GetChild(0).GetChild(2).gameObject.SetActive(false);
   }

   private ControllerReset(vehicleType:VehicleType) {
       const controller = ZepetoPlayers.instance.gameObject.GetComponentInChildren<UIZepetoPlayerControl>();
       if(vehicleType == VehicleType.Jetpack) {
            controller.transform.GetChild(0).GetChild(7).gameObject.SetActive(false);
            const joyConU = controller.transform.GetChild(0).GetChild(7).GetChild(0).gameObject.GetComponent<JoystickController>();
            const joyConD = controller.transform.GetChild(0).GetChild(7).GetChild(1).gameObject.GetComponent<JoystickController>();
            if(joyConU) joyConU.target = null;
            if(joyConD) joyConD.target = null;
            ZepetoPlayers.instance.motionV2Data.Gravity = this.originGravity;
       }
       controller.transform.GetChild(0).GetChild(2).gameObject.SetActive(true);
   }
}

export interface EquipData{
    key:string;
    sessionId:string;
    itemName:string;
    prevItemName:string;
    bone:HumanBodyBones;
}