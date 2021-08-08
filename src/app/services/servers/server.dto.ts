export interface ServerDto {
  maintenances: any[];
  state_detail: string;
  image: Image;
  creation_date: string;
  public_ip: PublicIp;
  private_ip: any;
  id: string;
  dynamic_ip_required: boolean;
  modification_date: string;
  enable_ipv6: boolean;
  hostname: string;
  state: string;
  location: any;
  ipv6: PublicIp;
  commercial_type: string;
  arch: string;
  name: string;
  volumes: Volume[];
  security_group: SecurityGroup;
  country: string;
  zone: string;
}

export interface Image {
  creation_date: string;
  default_bootscript: BootScript;
  from_server: string;
  arch: string;
  id: string;
  root_volume: RootVolume;
  name: string;
  modification_date: string;
  state: string;
  organization: string;
  extra_volumes: any[];
  public: boolean;
}

export interface BootScript {
  kernel: string;
  initrd: string;
  default: boolean;
  bootcmdargs: string;
  architecture: string;
  title: string;
  dtb: string;
  organization: string;
  id: string;
  public: boolean;
}

export interface RootVolume {
  size: number;
  id: string;
  volume_type: string;
  name: string;
}

export interface PublicIp {
  dynamic: false;
  id: string;
  address: string;
}

export interface Volume {
  size: number;
  state: string;
  name: string;
  modification_date: string;
  creation_date: string;
  id: string;
  volume_type: string;
}

export interface SecurityGroup {
  id: string;
  name: string;
}
