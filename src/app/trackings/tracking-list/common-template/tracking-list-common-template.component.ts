import { AfterViewChecked, ChangeDetectorRef, Component, EventEmitter, Input, NgZone, OnInit, Output, ViewChild } from "@angular/core";
import { MatPaginator, PageEvent } from "@angular/material/paginator";
import { read } from "fs";
import * as moment from "moment";
import { Observable } from "rxjs";
import { AuthGlobals } from "src/app/auth/auth-globals";
import { AuthService } from "src/app/auth/auth.service";
import { CommentService } from "src/app/custom-components/comments/comment.service";
import { OrganizationModel } from "src/app/models/organization.model";
import { ConsolidatedTrackingModel } from "src/app/models/tracking-models/consolidated-tracking.model";
import { InPersonTrackingModel } from "src/app/models/tracking-models/in-person-tracking.model";
import { ListItemModel } from "src/app/models/tracking-models/list-item.model";
import { MasterTrackingBox, MasterTrackingModel } from "src/app/models/tracking-models/master-tracking.model";
import { OnlineTrackingModel } from "src/app/models/tracking-models/online-tracking.model";
import { ServicedTrackingModel } from "src/app/models/tracking-models/serviced-tracking.model";
import { UserModel } from "src/app/models/user.model";
import { TrackingGlobals } from "../../tracking-globals";
import { TrackingService } from "../../tracking.service";


@Component({
  selector: 'tracking-list-common-template',
  templateUrl: './tracking-list-common-template.component.html',
  styleUrls: ['./tracking-list-common-template.component.css', "../tracking-list.component.css"]
})
export class TrackingListCommonTemplateComponent implements OnInit, AfterViewChecked {
  trackings: (OnlineTrackingModel | ServicedTrackingModel | InPersonTrackingModel | ConsolidatedTrackingModel | MasterTrackingModel)[] = [];

  totalTrackings = 0;
  pageSizeOptions = TrackingGlobals.defaultPageSizes;
  currentPageSize = this.pageSizeOptions[0];
  currentUser: UserModel;
  currentOrg: OrganizationModel;
  authGlobal = AuthGlobals;
  trackingGlobals = TrackingGlobals;

  getBadgeColor = TrackingGlobals.getBadgeColor;

  @ViewChild('paginator') paginator: MatPaginator;

  preTransitCodes = TrackingGlobals.preTransitCodes;
  inTransitCodes = TrackingGlobals.inTransitCodes
  deliveryCodes = TrackingGlobals.deliveryCodes
  failureCodes = TrackingGlobals.failureCodes;

  @Input() trackingsObservable: Observable<{trackings: (OnlineTrackingModel | ServicedTrackingModel | InPersonTrackingModel | ConsolidatedTrackingModel | MasterTrackingModel)[], count: number}> = new Observable();
  @Input() resetPaginatorObservable = new Observable()
  @Output() pageDataChangeEvent = new EventEmitter<PageEvent>();

  constructor(
    private trackingService: TrackingService,
    private commentService: CommentService,
    private authService: AuthService,
    private cd: ChangeDetectorRef,
    private zone: NgZone
  ){}

  ngOnInit() {
    this.currentUser = this.authService.getMongoDbUser();
    this.currentOrg = this.authService.getUserOrg();

    this.trackingsObservable.subscribe((data: {trackings: (OnlineTrackingModel | ServicedTrackingModel | InPersonTrackingModel | ConsolidatedTrackingModel | MasterTrackingModel)[], count: number}) => {
      this.trackings = data.trackings;
      this.totalTrackings = data.count;
    });

    this.resetPaginatorObservable.subscribe(() =>{
      this.paginator?.firstPage();
    });
  }

  ngAfterViewChecked() {
    this.cd.detectChanges();
  }

  onDelete(trackingId: string) {
    this.trackingService.deleteTracking(trackingId).subscribe(() => {
      // this.trackingService.getTrackings(this.trackingsPerPage, this.currentPage); // refetch after deletion
    });
  }

  // Change # of trackings per page
  pageDataChange(pageData: PageEvent) {
    this.pageDataChangeEvent.emit(pageData);
  }

  onCommentSubmit(trackingId: string, trackingNumber: string, content: string) {
    if (!content.trim()) {
      return;
    }
    let filePaths: string[] = [];
    this.commentService.createComment(trackingId, trackingNumber, content, filePaths)
      .subscribe(response => {
        this.trackings.filter(t => t._id === trackingId)[0].generalInfo.comments.unshift(response)
      });
  }

  getHeaderColor(status: string) {
    if (this.preTransitCodes.includes(status)) {
      return "bg-dark"
    } else if (this.inTransitCodes.includes(status)) {
      return "bg-warning"
    } else if (this.deliveryCodes.includes(status)) {
      return "bg-info"
    } else if (this.failureCodes.includes(status)) {
      return "bg-danger"
    } else if (status === "received_at_us_warehouse") {
      return "bg-success"
    }
  }

  formatDateTime(date: Date) {
    return moment(moment.utc(date).toDate()).fromNow(); //.local().format("MM-DD-YY hh:mm:ss")
  }

  now() {
    return moment().format("LLLL");
  }

  canView(roles: string[]) {
    return roles?.includes(this.authService.getMongoDbUser().role);
  }

  canEdit(roles: string[], creatorId: string) {
    return roles?.includes(this.authService.getMongoDbUser()?.role) || creatorId === this.currentUser._id
  }

  isAuth() {
    return this.authService.getIsAuth();
  }

  getItemCharge(item: ListItemModel) {
    return item.extraChargeUnit === '%'? item.declaredValue * item.quantity * (item.extraCharge / 100) + item.weight * item.unitCharge + item.declaredValue * item.quantity * (item.insurance / 100) :
                            item.extraCharge * item.quantity + item.weight * item.unitCharge + item.declaredValue * item.quantity * (item.insurance/ 100)

  }

  trackingToggle(tracking: OnlineTrackingModel | InPersonTrackingModel | ServicedTrackingModel | ConsolidatedTrackingModel | MasterTrackingModel, index: number, status: string) {
    this.trackingService.changeTrackingStatus(status, tracking.trackingNumber).subscribe(response => {
      this.zone.run(() => {
        this.trackings[index] = response.tracking;
      })
    });
  }

  childTrackingToggle(parentTracking: ConsolidatedTrackingModel, tracking: OnlineTrackingModel | InPersonTrackingModel | ServicedTrackingModel, index: number, childIndex: number, status: string) {
    this.trackingService.changeTrackingStatus(status, tracking.trackingNumber).subscribe(response => {
      this.trackingService.getTracking(parentTracking.trackingNumber).subscribe(foundTracking => {
        this.trackings[index] = foundTracking;
      })

      // this.zone.run(() => {
      //   if (tracking.trackingNumber.substring(0, 3) === this.trackingGlobals.trackingTypes.ONLINE) {
      //     (this.trackings[index] as ConsolidatedTrackingModel).onlineTrackings[childIndex] = response.tracking;
      //   } else if (tracking.trackingNumber.substring(0, 3) === this.trackingGlobals.trackingTypes.SERVICED) {
      //     (this.trackings[index] as ConsolidatedTrackingModel).servicedTrackings[childIndex] = response.tracking;
      //   } else if (tracking.trackingNumber.substring(0, 3) === this.trackingGlobals.trackingTypes.INPERSON) {
      //     (this.trackings[index] as ConsolidatedTrackingModel).inPersonTrackings[childIndex] = response.tracking;
      //   }
      // })
    });
  }

  getConsolidatedTotalWeightCost(tracking: ConsolidatedTrackingModel) {
    return this.getTotalWeightCostHelper(tracking);
  }

  getMasterTotalWeightCost(boxes: MasterTrackingBox[]) {
    let totalWeight = 0;
    let totalCost = 0;
    boxes.forEach(b => {
      let response = this.getTotalWeightCostHelper(b);
      totalWeight += response.weight;
      totalCost += response.cost;
    })
    return {weight: totalWeight, cost: totalCost};
  }

  getTotalWeightCostHelper(item: ConsolidatedTrackingModel | MasterTrackingBox) {
    let totalWeight = 0;
    let totalCost = 0;
    item.onlineTrackings.forEach(t => {
      totalWeight += t.generalInfo.totalWeight;
      totalCost += t.generalInfo.finalCost;
    });
    item.servicedTrackings.forEach(t => {
      totalWeight += t.generalInfo.totalWeight;
      totalCost += t.generalInfo.finalCost;
    });
    item.inPersonTrackings.forEach(t => {
      totalWeight += t.generalInfo.totalWeight;
      totalCost += t.generalInfo.finalCost;
    });

    return {weight: totalWeight, cost: totalCost};
  }

  combineTrackings(arr1: OnlineTrackingModel[], arr2: ServicedTrackingModel[], arr3: InPersonTrackingModel[]) {
    return [...arr1, ...arr2, ...arr3];
  }

  getConsolidatedTrackingOverallStatus(tracking: ConsolidatedTrackingModel, statuses: string[]) {
    let result = true;
    let trackingStatuses = this.combineTrackings(tracking.onlineTrackings, tracking.servicedTrackings, tracking.inPersonTrackings).map(t => t.generalInfo.status);

    if (trackingStatuses.length == 0) {return false;}

    for (let s of trackingStatuses) {
      if (!statuses.includes(s)) {
        result =  false;
        break;
      }
    }
    return result;
  }
}
