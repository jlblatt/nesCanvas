#!/usr/bin/perl

# cleanup.cgi
#
# Called every once in a while - remove .ncu files that have an old timestamp
#

use CGI qw(:standard);
use File::stat;

print "Content-type: text/html\n\n";

if(param()) {
    $chanName = param('chan');
    my @files = `ls -1 channels/$chanName/*.ncu`;
    chomp(@files);

    for($i = 0 ; $i < @files ; $i++) {
	my $timestamp = stat($files[$i])->mtime;
	my $now = time();
	
	#Delete files after 30 secs w/o an AJAX refresh call
	if($now - $timestamp > 30) {
	    system("rm $files[$i]");
	    #Also delete any pending messages for this user
	    $files[$i] =~ s/\.ncu/.ncm/;
	    system("rm $files[$i]");
	}
    }
    
}

else {
    #die("cleanup.cgi error - no parameters");
    $chanName = "narshe";
}
