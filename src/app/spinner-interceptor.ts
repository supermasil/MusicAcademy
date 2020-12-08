import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';

@Injectable()
export class SpinnerInterceptor implements HttpInterceptor{
    count = 0;
    constructor(private spinner: NgxSpinnerService) { }
    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
      this.spinner.show("spinner", {
        type: "ball-triangle-path",
        size: "large",
        bdColor: "rgba(255,250,250,0.8)",
        color: "#673AB7"
      });

      this.count++;
      return next.handle(req)
        .pipe(tap(
            // event => console.log(event),
            // error => console.log(error)
          ), finalize(() => {
            this.count--;
            if ( this.count == 0 ) this.spinner.hide ("spinner");
          })
        );
    }
}

//With each http request, the value of ‘count’ increases and the spinner is shown and when a response is received, the ‘count’ reduces by one. When all the http requests are finished( either successfully or with an error ), the value of ‘count’ reaches zero and the spinner is hid.
