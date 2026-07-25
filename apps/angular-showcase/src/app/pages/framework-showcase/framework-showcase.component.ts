import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SHOWCASE_FRAMEWORKS, SHOWCASE_TABS, ShowcaseFramework, ShowcaseTab } from '../../showcase/showcase-framework.model';
import { platformUrl } from '../../platform-urls';

@Component({
  selector: 'app-framework-showcase',
  standalone: false,
  templateUrl: './framework-showcase.component.html',
  styleUrls: ['./framework-showcase.component.sass']
})
export class FrameworkShowcaseComponent implements OnInit {
  framework: ShowcaseFramework = 'bootstrap';
  activeTab: ShowcaseTab = 'sample';

  readonly tabs = SHOWCASE_TABS;
  readonly portalUrl = platformUrl('portal');

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.framework = (data['framework'] ?? 'bootstrap') as ShowcaseFramework;
    });
  }

  get frameworkMeta() {
    return SHOWCASE_FRAMEWORKS.find((item) => item.id === this.framework);
  }

  setTab(tab: ShowcaseTab): void {
    this.activeTab = tab;
  }
}
