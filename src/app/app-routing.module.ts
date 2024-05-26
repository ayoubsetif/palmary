import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainComponent } from './main/main.component';
import { SalesComponent } from './sales/sales.component';

const routes: Routes = [
  { component: MainComponent, path : '' },
  { component: SalesComponent, path : 'sales' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
