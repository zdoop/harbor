import { Component, Output, EventEmitter, ViewChild, AfterViewChecked } from '@angular/core';
import { NgForm } from '@angular/forms';

import { ReplicationService } from '../replication.service';
import { MessageHandlerService } from '../../shared/message-handler/message-handler.service';
import { ActionType } from '../../shared/shared.const';

import { InlineAlertComponent } from '../../shared/inline-alert/inline-alert.component';

import { Target } from '../target';

import { TranslateService } from '@ngx-translate/core';

const FAKE_PASSWORD = 'rjGcfuRu';

@Component({
  selector: 'create-edit-destination',
  templateUrl: './create-edit-destination.component.html',
  styleUrls: [ 'create-edit-destination.component.css' ]
})
export class CreateEditDestinationComponent implements AfterViewChecked {

  modalTitle: string;
  createEditDestinationOpened: boolean;

  editable: boolean;

  testOngoing: boolean;
  pingTestMessage: string;
  pingStatus: boolean;

  actionType: ActionType;

  target: Target = new Target();
  initVal: Target = new Target();

  targetForm: NgForm;

  staticBackdrop: boolean = true;
  closable: boolean = false;

  @ViewChild('targetForm')
  currentForm: NgForm;

  hasChanged: boolean;

  endpointUrlHasChanged: boolean;

  @ViewChild(InlineAlertComponent)
  inlineAlert: InlineAlertComponent;

  @Output() reload = new EventEmitter<boolean>();
  
  constructor(
    private replicationService: ReplicationService,
    private messageHandlerService: MessageHandlerService,
    private translateService: TranslateService) {}

  openCreateEditTarget(editable: boolean, targetId?: number) {
    
    this.target = new Target();
    this.createEditDestinationOpened = true;
    this.editable = editable;

    this.hasChanged = false;
    this.endpointUrlHasChanged = false;

    this.pingTestMessage = '';
    this.pingStatus = true;
    this.testOngoing = false;  

    if(targetId) {
      this.actionType = ActionType.EDIT;
      this.translateService.get('DESTINATION.TITLE_EDIT').subscribe(res=>this.modalTitle=res);
      this.replicationService
          .getTarget(targetId)
          .subscribe(
            target=>{ 
              this.target = target;
              this.initVal.name = this.target.name;
              this.initVal.endpoint = this.target.endpoint;
              this.initVal.username = this.target.username;
              this.initVal.password = FAKE_PASSWORD;
              this.target.password = this.initVal.password;
            },
            error=>this.messageHandlerService.handleError(error)
          );
    } else {
      this.actionType = ActionType.ADD_NEW;
      this.translateService.get('DESTINATION.TITLE_ADD').subscribe(res=>this.modalTitle=res);
    }
  }

  testConnection() {
    this.translateService.get('DESTINATION.TESTING_CONNECTION').subscribe(res=>this.pingTestMessage=res);
    this.pingStatus = true;
    this.testOngoing = !this.testOngoing;

    let postedTarget: any = {};

    if(!this.endpointUrlHasChanged) {
       postedTarget = {
         id: this.target.id
       };
    } else {
      postedTarget = {
        endpoint: this.target.endpoint,
        username: this.target.username,
        password: this.target.password
      };
    }

    this.replicationService
        .pingTarget(postedTarget)
        .subscribe(
          response=>{
            this.pingStatus = true;
            this.translateService.get('DESTINATION.TEST_CONNECTION_SUCCESS').subscribe(res=>this.pingTestMessage=res);
            this.testOngoing = !this.testOngoing;
          },
          error=>{
            this.pingStatus = false;
            this.translateService.get('DESTINATION.TEST_CONNECTION_FAILURE').subscribe(res=>this.pingTestMessage=res);
            this.testOngoing = !this.testOngoing;
          }
        )
  }

  clearPassword($event: any) {
    if(this.editable) {
      this.target.password = '';
      this.endpointUrlHasChanged = true;
    }
  }

  onSubmit() {
    switch(this.actionType) {
    case ActionType.ADD_NEW:
      this.replicationService
          .createTarget(this.target)
          .subscribe(
            response=>{
              this.messageHandlerService.showSuccess('DESTINATION.CREATED_SUCCESS');
              console.log('Successful added target.');
              this.createEditDestinationOpened = false;
              this.reload.emit(true);
            },
            error=>{
              let errorMessageKey = '';
              switch(error.status) {
              case 409:
                errorMessageKey = 'DESTINATION.CONFLICT_NAME';
                break;
              case 400:
                errorMessageKey = 'DESTINATION.INVALID_NAME';
                break;
              default:
                errorMessageKey = 'UNKNOWN_ERROR';
              }
              
              this.translateService
                  .get(errorMessageKey)
                  .subscribe(res=>{
                    if(this.messageHandlerService.isAppLevel(error)) {
                      this.messageHandlerService.handleError(error);
                      this.createEditDestinationOpened = false;
                    } else {
                      this.inlineAlert.showInlineError(res);
                    }
                  });
            }
          );
        break;
    case ActionType.EDIT:
      if(!this.endpointUrlHasChanged) {
        this.createEditDestinationOpened = false;
        return;
      } 
      this.replicationService
          .updateTarget(this.target)
          .subscribe(
            response=>{ 
              this.messageHandlerService.showSuccess('DESTINATION.UPDATED_SUCCESS');
              console.log('Successful updated target.');
              this.createEditDestinationOpened = false;
              this.reload.emit(true);
            },
            error=>{
              let errorMessageKey = '';
              switch(error.status) {
              case 409:
                errorMessageKey = 'DESTINATION.CONFLICT_NAME';
                break;
              case 400:
                errorMessageKey = 'DESTINATION.INVALID_NAME';
                break;
              default:
                errorMessageKey = 'UNKNOWN_ERROR';
              }
              this.translateService
                  .get(errorMessageKey)
                  .subscribe(res=>{
                    if(this.messageHandlerService.isAppLevel(error)) {
                      this.messageHandlerService.handleError(error);
                      this.createEditDestinationOpened = false;
                    } else {
                      this.inlineAlert.showInlineError(res);
                    }
                  });
            }
          );
        break;
    }
  }

  onCancel() {
    if(this.hasChanged) {
      this.inlineAlert.showInlineConfirmation({message: 'ALERT.FORM_CHANGE_CONFIRMATION'});
    } else {
      this.createEditDestinationOpened = false;
      this.targetForm.reset();
    }
  }

  confirmCancel(confirmed: boolean) {
    this.createEditDestinationOpened = false;
    this.inlineAlert.close();
  }

  mappedName: {} = {
    'targetName': 'name',
    'endpointUrl': 'endpoint',
    'username': 'username',
    'password': 'password'
  };

  ngAfterViewChecked(): void {
    this.targetForm = this.currentForm;
    if(this.targetForm) {
      this.targetForm.valueChanges.subscribe(data=>{
        for(let i in data) {
          let current = data[i];
          let origin = this.initVal[this.mappedName[i]];
          if(((this.actionType === ActionType.EDIT && this.editable && !current)  || current) && current !== origin) {
            this.hasChanged = true;
            break;
          } else {
            this.hasChanged = false;
            this.inlineAlert.close();
          }
        }
      });
    }
  }

}