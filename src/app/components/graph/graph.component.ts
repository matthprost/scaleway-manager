import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  ViewChild,
} from "@angular/core";
// import { Chart } from "chart.js/dist/chart.js";

import { BillingDto } from "../../services/billing/billing.dto";

@Component({
  selector: "app-graph",
  templateUrl: "./graph.component.html",
  styleUrls: ["./graph.component.scss"],
})
export class GraphComponent implements OnChanges {
  @Input() billings: BillingDto;
  @Input() organizationName: any;
  @Input() projectName: any;

  @ViewChild("billingCanvas") barCanvas: ElementRef;
  // private barChart: Chart;
  private dates;
  public values;
  public currency;

  ngOnChanges(): void {
    this.formatData(this.billings);

    // this.barChart = new Chart(this.barCanvas.nativeElement, {
    //   type: "line",
    //   data: {
    //     labels: this.dates,
    //     datasets: [
    //       {
    //         label: "",
    //         data: this.values,
    //         backgroundColor: "rgba(255, 255, 255, 0)",
    //         borderColor: "rgba(255, 255, 255, 0.8)",
    //         borderWidth: 1,
    //         pointRadius: 6,
    //         pointHoverRadius: 7,
    //       },
    //     ],
    //   },
    //   options: {
    //     // tooltips: {
    //     //   backgroundColor: "white",
    //     //   bodyFontColor: "black",
    //     //   callbacks: {
    //     //     label: function (tooltipItem, data) {
    //     //       return tooltipItem.xLabel + ": " + tooltipItem.yLabel;
    //     //     },
    //     //     // remove title
    //     //     title: function (tooltipItem, data) {
    //     //       return;
    //     //     },
    //     //   },
    //     //   custom: function (tooltip) {
    //     //     if (!tooltip) {
    //     //       return;
    //     //     }
    //     //     // disable displaying the color box;
    //     //     tooltip.displayColors = false;
    //     //   },
    //     // },
    //     // legend: {
    //     //   display: false,
    //     // },
    //     scales: {
    //       // yAxes: [
    //       //   {
    //       //     ticks: {
    //       //       display: false,
    //       //       fontColor: "rgba(255, 255, 255, 0.8)",
    //       //     },
    //       //     gridLines: {
    //       //       display: true,
    //       //       color: "rgba(255, 255, 255, 0.3)",
    //       //       drawBorder: false,
    //       //       zeroLineColor: "rgba(255, 255, 255, 0.5)",
    //       //       zeroLineWidth: 1,
    //       //       borderDash: [1.5],
    //       //     },
    //       //   },
    //       // ],
    //       // xAxes: [
    //       //   {
    //       //     ticks: {
    //       //       fontColor: "#FFFFFF",
    //       //     },
    //       //     gridLines: {
    //       //       display: false,
    //       //     },
    //       //   },
    //       // ],
    //     },
    //   },
    // });
  }

  private formatData(data) {
    const array = [];
    const values = [];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    if (!data) {
      return [];
    }

    data.forEach((result) => {
      const parseResult = Number(result.billing_period.slice(-2));
      array.push(months[parseResult - 1]);
    });

    this.dates = array.reverse();

    data.forEach((result) => {
      values.push(result.total_taxed);
    });

    this.values = values.reverse();

    this.currency = (data[0] && data[0].currency) || "";

    return []
  }
}
