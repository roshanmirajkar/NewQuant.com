import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-index',
  templateUrl: './index.component.html',
  styleUrls: ['./index.component.scss']
})
export class IndexComponent implements OnInit {

  public wallets = {
    'btc': '1D5gSTpcT7acHER4dFPjYKMnZGWGZkfhQn',
    'eth': '0x6281c900021bf3B9996BaA11f196871FBF976000',
    'ltc': 'LhHwvkGx4Sck3JNwRxNkzcgXzfCrWJiwSR'
  };

  constructor() { }

  ngOnInit() {
  }

}
