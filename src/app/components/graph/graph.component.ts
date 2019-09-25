import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {Chart} from 'chart.js';
import {BillingService} from '../../services/billing/billing.service';


@Component({
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss'],
})
export class GraphComponent implements OnInit {

  @ViewChild('billingCanvas') barCanvas: ElementRef;
  private barChart: Chart;
  private dates;
  private values;
  private currency;

  constructor(private billingService: BillingService) {
  }

  private formatData(data) {
    const array = [];
    const values = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    data.forEach(result => {
      const parseResult = parseInt(result.billing_period.slice(-2), 12);
      array.push(months[parseResult]);
    });

    this.dates = array.reverse();
    array[array.length - 1] = 'Now';

    data.forEach(result => {
      values.push(result.total_taxed);
    });

    this.values = values.reverse();
    this.currency = data[0].currency;
  }

  ngOnInit() {
    this.billingService.getXMonthsLastBilling(6).then(result => {
      this.formatData(result);
    }).then(() => {

      this.barChart = new Chart(this.barCanvas.nativeElement, {
        type: 'line',
        data: {
          labels: this.dates,
          datasets: [
            {
              label: '',
              data: this.values,
              backgroundColor: 'rgba(255, 255, 255, 0)',
              borderColor: 'rgba(255, 255, 255, 0.8)',
              borderWidth: 1,
              pointRadius: 6,
              pointHoverRadius: 7,
            }
          ]
        },
        options: {
          tooltips: {
            backgroundColor: 'white',
            bodyFontColor: 'black',
            callbacks: {
              label: function(tooltipItem, data) {
                return tooltipItem.xLabel + ': ' + tooltipItem.yLabel + '€';
              },
              // remove title
              title: function(tooltipItem, data) {
                return;
              },
            },
            custom: function(tooltip) {
              if (!tooltip) {
                return;
              }
              // disable displaying the color box;
              tooltip.displayColors = false;
            },
          },
          legend: {
            display: false
          },
          scales: {
            yAxes: [
              {
                ticks: {
                  beginAtZero: true,
                  display: false,
                },
                gridLines: {
                  display: true,
                  color: 'rgba(255, 255, 255, 0.3)',
                  drawBorder: false,
                  zeroLineColor: 'rgba(255, 255, 255, 0.5)',
                  zeroLineWidth: 1,
                  borderDash: [1.5]
                },
              }
            ],
            xAxes: [
              {
                ticks: {
                  fontColor: '#FFFFFF'
                },
                gridLines: {
                  display: false,
                },
              }
            ]
          }
        },
      });
    });
  }

}
