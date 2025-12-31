/*
crowd_female_sitting.scad
Generic, cartoon-simple seated person. No chair included.
Same export steps as male.
*/

$fn = 36;

// ---------- parameters ----------
scale_mm = 1.0;
base_thickness = 0.8;

// Slightly different proportions / silhouette
hip_w = 9.5;
hip_d = 6.8;
torso_w = 7.6;
torso_d = 5.3;
torso_h = 12.5;

head_r = 4.0;
neck_r = 1.6;
neck_h = 2.0;

arm_r = 1.25;
leg_r = 1.55;

back_lean_deg = 12;
knee_bend_deg = 75;
elbow_bend_deg = 55;

seat_height = 9.0;
thigh_len = 7.3;
shin_len = 6.9;
foot_len = 4.3;

upperarm_len = 5.8;
forearm_len = 5.2;

// "hair" bulge option (0 = none)
hair = 1;

// ---------- helpers ----------
module capsule(r, h){
    union(){
        cylinder(r=r, h=h);
        sphere(r=r);
        translate([0,0,h]) sphere(r=r);
    }
}

module limb_segment(r, len){
    rotate([0,90,0]) capsule(r, len);
}

module person_female(){
    union(){
        if(base_thickness > 0)
            translate([0,0,base_thickness/2])
                cube([22,18,base_thickness], center=true);

        // Hips
        translate([0,0,seat_height])
            minkowski(){
                cube([hip_w, hip_d, 5.2], center=true);
                sphere(r=1.2);
            }

        // Torso with a tiny waist taper
        translate([0,0,seat_height+5.0])
            rotate([back_lean_deg,0,0])
            translate([0,0,torso_h/2])
            hull(){
                translate([0,0,0])      scale([1.00,1.00,1.00]) sphere(r=4.3);
                translate([0,0,torso_h]) scale([0.90,0.95,1.00]) sphere(r=4.1);
            }

        // Neck
        translate([0,0,seat_height+5.0])
            rotate([back_lean_deg,0,0])
            translate([0,0,torso_h + neck_h/2])
            cylinder(r=neck_r, h=neck_h, center=true);

        // Head
        translate([0,0,seat_height+5.0])
            rotate([back_lean_deg,0,0])
            translate([0,0,torso_h + neck_h + head_r*0.95])
            sphere(r=head_r);

        // Simple hair (back bun / puff)
        if(hair==1)
        translate([0,0,seat_height+5.0])
            rotate([back_lean_deg,0,0])
            translate([0,-head_r*0.55,torso_h + neck_h + head_r*1.05])
            scale([1.05,0.9,0.85])
            sphere(r=head_r*0.75);

        // Legs
        for(side=[-1,1]){
            x_off = side*(hip_w*0.30);

            translate([x_off, hip_d*0.15, seat_height+1.0])
                limb_segment(leg_r, thigh_len);

            translate([x_off + thigh_len, hip_d*0.15, seat_height+1.0])
                rotate([0, -knee_bend_deg, 0])
                limb_segment(leg_r*0.95, shin_len);

            translate([x_off + thigh_len + shin_len*cos(knee_bend_deg), hip_d*0.15, seat_height+1.0 - shin_len*sin(knee_bend_deg)])
                translate([foot_len/2, 0, -leg_r*0.2])
                scale([1.0,0.62,0.45])
                sphere(r=leg_r*1.65);
        }

        // Arms
        for(side=[-1,1]){
            y_sh = -torso_d*0.55;
            x_sh = side*(torso_w*0.58);
            z_sh = seat_height+5.0 + 8.7;

            translate([x_sh,y_sh,z_sh])
                rotate([0, 38, 0])
                limb_segment(arm_r, upperarm_len);

            translate([x_sh + upperarm_len*cos(38), y_sh, z_sh - upperarm_len*sin(38)])
                rotate([0, 38 + elbow_bend_deg, 0])
                limb_segment(arm_r*0.95, forearm_len);

            translate([x_sh + upperarm_len*cos(38) + forearm_len*cos(38+elbow_bend_deg),
                       y_sh,
                       z_sh - upperarm_len*sin(38) - forearm_len*sin(38+elbow_bend_deg)])
                scale([0.85,0.72,0.58])
                sphere(r=arm_r*2.0);
        }
    }
}

scale([scale_mm, scale_mm, scale_mm])
person_female();
