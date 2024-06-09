import { Component } from '@angular/core';
import * as XLSX from 'xlsx';
import * as _ from 'lodash';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-stock',
  templateUrl: './stock.component.html',
  styleUrls: ['./stock.component.scss']
})
export class StockComponent {
  file!: File;
	arrayBuffer: any;
  products: any ;
  stockSystem: any = [];
  stockERP: any = [];
	secondPlacement = '';
  comparator: any = [];
	displayedColumns: string[] = ['itemCode', 'itemName', 'salesQuantity', 'erpQuantity', 'diff'];

  constructor(private snackBar: MatSnackBar) { }

  ngOnInit() {
		this.products =  JSON.parse(localStorage.getItem('palmaryProducts')!);
	}

  uploadSystemFile(event: any) {
		this.file = event.target.files[0];
		const fileReader = new FileReader();
		fileReader.onload = (e) => {
			const worksheet = this.readFile(fileReader);
			const arr = XLSX.utils.sheet_to_json(worksheet, {raw: true });
      const a = _.findIndex(_.drop(arr, 2), function(o: any) { return o['STock Depot'] == 'Total:'; });
      const t = _.slice(_.drop(arr, 2), 0 ,a)
      
      const stock: any = [];
      const variables: any = [];
      Object.keys(<any>t[0]).map(e => {  variables.push(e) });
      t.forEach((e:any)=> {
        stock.push({
          itemcode: e[variables[0]],
          itemName: e[variables[1]],
          quantityCS: e[variables[2]],
          quantityEA: e[variables[3]],
          quantity: this.getQuantity(e[variables[0]], e[variables[2]], e[variables[3]])
        })
      })
      this.stockSystem = stock;
      this.comparator = this.compareArrays(this.stockSystem, this.stockERP);
		};
		fileReader.readAsArrayBuffer(this.file);
	}

  getQuantity(code: any, cs: any, ea: any) {
    if(this.products[code]) {
      return (this.products[code]['Colisage'] * cs ) + ea;
    }else {
      this.snackBar.open('Produit manquant dans Config :' + code , 'Ok', { duration : 7000 });
    }
  }

  uploadERPFile(event: any) {
    this.file = event.target.files[0];
		const fileReader = new FileReader();
		fileReader.onload = (e) => {
			const worksheet = this.readFile(fileReader);
			const arr = XLSX.utils.sheet_to_json(worksheet, {raw: true });
			const erp: any = [];
			let emplacement = "";
			_.drop(arr, 1).forEach((l:any)=> {
				if(l['__EMPTY_1']) {
				emplacement = l['__EMPTY_1'];
				this.secondPlacement = l['__EMPTY_1'];
				} else {
					emplacement = this.secondPlacement;
				}
				erp.push({
					itemcode: l['__EMPTY_2'] ? this.getProduct(l['__EMPTY_2']).id : "",
					itemName: l['__EMPTY_2'] ? this.getProduct(l['__EMPTY_2']).name : "",
					quantity: l['Total'],
					emplacement: emplacement.replaceAll(' ', '')
				})
			})
      const emp = _.compact(_.uniq(erp.map((m: any) => m['emplacement']))).filter((f: any) => !f.indexOf('Stock'));
      const stockERp: any = [];
      erp.forEach((o:any) => {
        if(o['emplacement'] === emp[0]) {
          if(o['itemcode']) { stockERp.push(o) }
        }
        else {
          //console.log('not', o)
        }
      })
      this.stockERP = stockERp;
      this.comparator = this.compareArrays(this.stockSystem, this.stockERP);
		};
		fileReader.readAsArrayBuffer(this.file);
  }

  getProduct(prod: any) {
		const id = prod.split('[')[1].split(']')[0];
		const name = _.trim(prod.split('[')[1].split(']')[1]);
		return { id: id, name: name };
	}

  compareArrays(sales: any[], erp: any[]) {
		const uniqueSales = sales.filter(f => {
			return !erp.some(o => f['itemcode'] === o['itemcode'] && f['quantity'] === o['quantity'] );
		});
		const uniqueErp = erp.filter(f => {
			return !sales.some(o => f['itemcode'] === o['itemcode'] && f['quantity'] === o['quantity']);
		});
		const diff = JSON.parse(JSON.stringify(_.uniqBy(uniqueSales.concat(uniqueErp), 'itemcode')));

		diff.forEach((d:any) => {
			const m = sales.find(f => f['itemcode'] === d['itemcode']);
			const r = erp.find(q => q['itemcode'] === d['itemcode']);
			if (!m) {
				d['quantity'] = r['quantity'] - 0;
				d['salesQuantity'] = 0;
				d['erpQuantity'] = r['quantity'];
			} else if (!r) {
				d['quantity'] = 0 - m['quantity'];
				d['erpQuantity'] = 0;
				d['salesQuantity'] = m['quantity'];
			}	else {
				d['erpQuantity'] = r['quantity'];
				d['salesQuantity'] = m['quantity'];
				d['quantity'] = r['quantity'] - m['quantity'];
			}
		});
		return diff;
	}

  download() {
		const compare: any = [];
		this.comparator.forEach((e:any) => {
			compare.push([e['itemcode'], e['itemName'], e['salesQuantity'], e['erpQuantity'], e['quantity']])
		})
		compare.unshift(['Item code', 'Item Name', 'Quantity(Sales)', 'Quantity(ErP)', 'Diff' ])
		const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(compare);
		/* generate workbook and add the worksheet */
		const wb: XLSX.WorkBook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
		/* save to file */
		XLSX.writeFile(wb, `diff de stock.xlsx`);
	}


  readFile(fileReader: any) {
		this.arrayBuffer = fileReader.result;
		const data = new Uint8Array(this.arrayBuffer);
		const arr = new Array();
		for (let i = 0; i !== data.length; ++i) { arr[i] = String.fromCharCode(data[i]); }
		const bstr = arr.join('');
		const workbook = XLSX.read(bstr, {type: 'binary'});
		const first_sheet_name = workbook.SheetNames[0];
		return workbook.Sheets[first_sheet_name];
	}

}
