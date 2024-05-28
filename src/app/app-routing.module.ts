import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainComponent } from './main/main.component';
import { SalesComponent } from './sales/sales.component';
import { StockComponent } from './stock/stock.component';

const routes: Routes = [
  { component: MainComponent, path : '' },
  { component: SalesComponent, path : 'sales' },
  { component: StockComponent, path : 'stock' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
