import { Component, NgZone, OnInit } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import * as moment from "moment";
import { ReplaySubject } from "rxjs";
import { OrganizationModel } from "src/app/models/organization.model";
import { UserModel } from "src/app/models/user.model";
import { AuthGlobals } from "../../auth-globals";
import { AuthService } from "../../auth.service";


@Component({
  selector: 'adjust-credit-form',
  templateUrl: './adjust-credit.component.html',
  styleUrls: ['./adjust-credit.component.css', '../auth.component.css']
})
export class AdjustCreditFormComponent implements OnInit{

  usersSubject = new ReplaySubject<string[]>();
  users: UserModel[];
  currentOrg: OrganizationModel;
  currentUser: UserModel;
  editUser: UserModel;
  creditForm: FormGroup;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private zone: NgZone
  ) {}

  ngOnInit() {
    // this.authService.getMongoDbUserListener().subscribe((user: UserModel) => {
      this.currentUser = this.authService.getMongoDbUser();
      // this.authService.getUserOrgListener().subscribe((org: OrganizationModel) => {
        this.currentOrg = this.authService.getUserOrg();
        this.authService.getUsers().subscribe((response: {users: UserModel[], count: number}) => {
          this.users = response.users;
          this.users = this.users.filter(u => u.role == AuthGlobals.roles.Customer);
          this.usersSubject.next(this.users.map(u => `${u.name} | ${u.userCode} | ${u.credit} | ${u.role} | ${u.email} | ${u.addresses[0].address}${u.addresses[0].addressLineTwo? " " + u.addresses[0].addressLineTwo: ""}`));
        })
    //   });
    // });
  }

  createForm() {
    this.creditForm = new FormGroup({
      _id: new FormControl(null, {validators: [Validators.required]}),
      amount: new FormControl(0, {validators: [Validators.required]}),
      content: new FormControl("")
    });
  }

  userSelected(value: string) {
    this.editUser = this.users.filter(u => u.userCode === value.split(" | ")[1])[0];
    this.authService.getUser(this.editUser._id, this.authService.userTypes.MONGO).subscribe(user => {
      this.editUser = user;
    });
    this.createForm();
    this.creditForm.get('_id').setValue(this.editUser._id);
  }

  formatDateTime(date: Date) {
    return moment(moment.utc(date).toDate()).local().format("MM-DD-YY hh:mm:ss")
  }

  onSubmit() {
    if (this.creditForm.invalid) {
      return;
    }
    this.authService.updateCredit(this.creditForm.getRawValue()).subscribe(() => {
      this.authService.getUser(this.editUser._id, this.authService.userTypes.MONGO).subscribe(user => {
        this.editUser = user;
      });
    });
  }
}
