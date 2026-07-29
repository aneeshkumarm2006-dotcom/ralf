[out:json][timeout:90];
(
  way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|residential|unclassified|living_street|pedestrian)$"](45.5011,-73.56275,45.5119,-73.54225);
  way["natural"="water"](45.5011,-73.56275,45.5119,-73.54225);
  way["waterway"="riverbank"](45.5011,-73.56275,45.5119,-73.54225);
  relation["natural"="water"](45.5011,-73.56275,45.5119,-73.54225);
  way["leisure"~"^(park|garden|pitch)$"](45.5011,-73.56275,45.5119,-73.54225);
  way["landuse"~"^(grass|forest|cemetery)$"](45.5011,-73.56275,45.5119,-73.54225);
  way["railway"="rail"](45.5011,-73.56275,45.5119,-73.54225);
);
out geom;
