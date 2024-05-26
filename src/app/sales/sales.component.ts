import { Component } from '@angular/core';
import * as XLSX from 'xlsx';
import * as _ from 'lodash';

@Component({
  selector: 'app-sales',
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.scss']
})
export class SalesComponent {
 	sales: any = [];
	retours: any = [];
 	file!: File;
 	arrayBuffer: any;
  	salesmanList: any = [];
	data: any = [];
	salesman: any = {};
	displayedColumns: string[] = ['vendeur', 'id', 'name', 'quantity', 'unitPrice', 'totalPrice'];

	ngOnInit() {
		this.salesman =  JSON.parse(localStorage.getItem('configPalmary')!);
	}


  	uploadFile(event: any) {
    	this.file = event.target.files[0];
		const fileReader = new FileReader();
		fileReader.onload = (e) => {
			const worksheet = this.readFile(fileReader);
			const arr = XLSX.utils.sheet_to_json(worksheet, {raw: true });
	    	let data: any = [];
			_.drop(arr).forEach((l:any) => {
				data.push({
					salesman: l['__EMPTY_1'],
					productCode: l['__EMPTY_6'],
					productName: l['__EMPTY_7'],
					quantity: l['__EMPTY_10'],
					totalPrice: l['__EMPTY_14'],
					unitPrice: l['__EMPTY_14'] / l['__EMPTY_10']
				})
			})
			this.data = data;
			this.salesmanList = _.compact(_.uniq(_.drop(arr).map((m: any) => m['__EMPTY_1'])));
		};
		fileReader.readAsArrayBuffer(this.file);
    }

  	selectVendor(event: any) {
		const sale: any = [];
		const retour: any = [];
		event.value.forEach((v: any) => {
			const aSale: any = { id: v, sales: [], globalSales: []};
			const ss: any = [];
			this.data.filter((f:any) => f['salesman'] === v).forEach((s: any) => {
				ss.push({
					salesman: s['salesman'],
					id: s['productCode'],
					name: s['productName'],
					price: s['unitPrice'] ,
					quantity: s['quantity'],
					totalPrice: s['totalPrice']
				});
			});
			aSale['globalSales'] =ss;
			Object.keys(_.groupBy(ss, 'id')).map(m => {
				if (_.groupBy(ss, 'id')[m].length > 1) {
					const t = _.groupBy(_.groupBy(ss, 'id')[m], 'id');
					Object.keys(t).forEach(e => {
						const freeSales = t[e].filter(f => f['totalPrice'] === 0);
						const notFreeSales = t[e].filter(f => f['totalPrice'] !== 0);

						const aon =notFreeSales.map(p => p['totalPrice']);
						const sum = _.reduce(aon, function(a, b) { return a + b; }, 0);

						const aonq = notFreeSales.map(p => p['quantity']);
						const sumq = _.reduce(aonq, function(a, b) { return a + b; }, 0);

						//////////
						if(sumq > 0 ) {
							// total quantities more than 0 to avoid having articles with 0 quantity
							if(sum === 0 ) {
								//price for ERP use avoid simple 0 and do 0.001 instead
								aSale['sales'].push([t[e][0]['id'], t[e][0]['name'], '', sumq, 0.001  , 0  ]);
							} else {
								aSale['sales'].push([t[e][0]['id'], t[e][0]['name'], '', sumq, sum / sumq , 0 ]);
							}
						}

						const aonn =freeSales.map(p => p['totalPrice']);
						const sumn = _.reduce(aonn, function(a, b) { return a + b; }, 0);

						const aonqn = freeSales.map(p => p['quantity']);
						const sumqn = _.reduce(aonqn, function(a, b) { return a + b; }, 0);
						if(sumqn > 0 ) {
							if(sumn === 0 ) {
								aSale['sales'].push([t[e][0]['id'], t[e][0]['name'], '', sumqn, 0.001 , 0 ]);

							} else {
								aSale['sales'].push([t[e][0]['id'], t[e][0]['name'], '', sumqn, sumn / sumqn , 0 ]);
							}
						}
						// retour
						if(sumq < 0) {
							console.log('test', t[e]);
							
							const aon =t[e].map(p => p['totalPrice']);
							const sum = _.reduce(aon, function(a, b) { return a + b; }, 0);

							const aonq = t[e].map(p => p['quantity']);
							const sumq = _.reduce(aonq, function(a, b) { return a + b; }, 0);

							retour.push({
								vendeur: t[e][0]['salesman'],
								id: t[e][0]['id'],
								name: t[e][0]['name'],
								quantity: sumq,
								unitPrice: sum / sumq,
								totalPrice: sum
							})
						}
					})
				} else {
					const a = _.groupBy(ss, 'id')[m][0];
					if(a['totalPrice'] === 0) {
						aSale['sales'].push([a['id'], a['name'], '', a['quantity'], 0.001, a['quantity'] * 0.001  ]);
					} else {
						if(a['totalPrice'] < 0 ) {
							retour.push({
								vendeur: a['salesman'],
								id: a['id'],
								name: a['name'],
								quantity: a['quantity'],
								unitPrice: a['totalPrice'] / a['quantity'],
								totalPrice: a['totalPrice']
							})
							
						} else {
							aSale['sales'].push([a['id'], a['name'], '', a['quantity'], a['totalPrice'] / a['quantity'], a['totalPrice']  ]);
						}
					}
				}
			});
			sale.push(aSale);
		});
		this.retours = retour;
		this.sales = sale;
	}

	download() {
		const vendorSales = JSON.parse(JSON.stringify(this.sales));
		vendorSales.forEach((v:any) => {
			v.sales.map((m:any) => m[5] = m[4] * m[3]);
			v.sales.unshift(['Code Article', 'Article', 'Quantité conditionnée ', 'Quantité', 'Prix unitaire', 'Sous-total'  ])
		
			const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(v.sales);
			/* generate workbook and add the worksheet */
			const wb: XLSX.WorkBook = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

			/* save to file */
			XLSX.writeFile(wb, `${v.id}.xlsx`);
		});
  	}

    downloadGroupedSales() {
		const vendorSales = JSON.parse(JSON.stringify(this.sales));
		vendorSales.forEach((v:any) => {
			v.sales.forEach((sale: any) => {
				sale.unshift(
					this.salesman[v.id]['Depot'], this.salesman[v.id]['Marque'], this.salesman[v.id]['vendeurERP'],
					this.salesman[v.id]['codeClient'], this.salesman[v.id]['clientERP'],
					this.salesman[v.id]['emplacement']
				);
			});
		});
		const globalSales = _.flatten(vendorSales.map((m: any) => m.sales));
		globalSales.forEach((s:any) => { s[11] = s[9] * s[10] });

		globalSales.unshift([
			'Entrepot ', 'Marque ', 'Vendeur',
			'Code client', 'Client', 'Emplacement',
			'Code Article', 'Article', 'Quantité conditionnée ',
			'Quantité', 'Prix unitaire', 'Sous-total'
		]);

		// not optimal but why XD
		const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(<any>globalSales);

		/* generate workbook and add the worksheet */
		const wb: XLSX.WorkBook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, 'GlobalSales');

		/* save to file */
		XLSX.writeFile(wb, `Vente Globale.xlsx`);
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
